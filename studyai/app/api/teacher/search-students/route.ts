import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { data: me } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", auth.userId)
    .single();
  if (me?.role !== "teacher") {
    return NextResponse.json({ error: "Teacher role required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ students: [] });
  }

  const pattern = `%${q}%`;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, username, full_name")
    .eq("role", "student")
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ students: data ?? [] });
}
