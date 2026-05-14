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

// Role buckets. Legacy 'admin' is intentionally kept as a synonym of
// 'superadmin' until the Phase 5 data migration runs.
export const SUPERADMIN_ROLES = new Set<string>(["superadmin", "admin"]);
export const ADMINISTRATION_ROLES = new Set<string>([
  "administration",
  ...SUPERADMIN_ROLES,
]);

async function loadRole(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role ?? null;
}

export async function requireSuperadmin(userId: string): Promise<boolean> {
  const role = await loadRole(userId);
  return role ? SUPERADMIN_ROLES.has(role) : false;
}

export async function requireAdministration(userId: string): Promise<boolean> {
  const role = await loadRole(userId);
  return role ? ADMINISTRATION_ROLES.has(role) : false;
}

export async function requireTeacher(userId: string): Promise<boolean> {
  const role = await loadRole(userId);
  return role === "teacher";
}

export async function requireTutor(userId: string): Promise<boolean> {
  const role = await loadRole(userId);
  return role === "tutor";
}

/**
 * Deprecated alias of {@link requireSuperadmin}. Kept so existing callers
 * keep compiling and legacy 'admin' profiles still pass.
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  return requireSuperadmin(userId);
}
