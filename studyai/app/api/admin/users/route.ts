import { NextResponse } from "next/server";

import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const roleFilter = searchParams.get("role")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));

  const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
    page,
    perPage: pageSize,
  });

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  const users = listData.users ?? [];
  const ids = users.map((u) => u.id);
  let profiles: Record<
    string,
    {
      username: string | null;
      full_name: string | null;
      role: string;
      xp: number;
      level: number;
      last_study_date: string | null;
      created_at: string;
    }
  > = {};

  if (ids.length > 0) {
    const { data: profRows } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, role, xp, level, last_study_date, created_at")
      .in("id", ids);
    profiles = Object.fromEntries((profRows ?? []).map((p) => [p.id as string, p as (typeof profiles)[string]]));
  }

  let rows = users.map((u) => {
    const p = profiles[u.id];
    const email = u.email ?? "";
    return {
      id: u.id,
      email,
      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      role: p?.role ?? "student",
      xp: p?.xp ?? 0,
      level: p?.level ?? 0,
      last_study_date: p?.last_study_date ?? null,
      created_at: p?.created_at ?? u.created_at,
    };
  });

  if (q) {
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(q) ||
        (r.username && r.username.toLowerCase().includes(q)) ||
        (r.full_name && r.full_name.toLowerCase().includes(q))
    );
  }
  if (roleFilter && ["student", "teacher", "admin"].includes(roleFilter)) {
    rows = rows.filter((r) => r.role === roleFilter);
  }

  return NextResponse.json({
    users: rows,
    page,
    pageSize,
    total: listData.total ?? rows.length,
  });
}
