import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase/admin";

type AuthOk = {
  ok: true;
  userId: string;
  token: string;
};

type AuthErr = {
  ok: false;
  status: number;
  message: string;
};

export async function authenticateRequest(
  request: Request
): Promise<AuthOk | AuthErr> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, status: 401, message: "Unauthorized. Missing token." };
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token);

  if (error || !user) {
    return { ok: false, status: 401, message: "Unauthorized." };
  }

  return { ok: true, userId: user.id, token };
}

export async function requireAdmin(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

export async function requireTeacher(userId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "teacher";
}
