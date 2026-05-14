import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Role =
  | "student"
  | "teacher"
  | "tutor"
  | "administration"
  | "superadmin"
  | "admin"; // legacy alias kept until Phase 5

const ALLOWED_ROLES = new Set<Role>([
  "student",
  "teacher",
  "tutor",
  "administration",
  "superadmin",
  "admin",
]);

function isRole(value: unknown): value is Role {
  return typeof value === "string" && ALLOWED_ROLES.has(value as Role);
}

async function listAllAuthUsers() {
  const users = [];
  let authPage = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: authPage,
      perPage,
    });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < perPage) return users;
    authPage += 1;
  }
}

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const roleFilter = searchParams.get("role")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
  const validRoleFilter = isRole(roleFilter) ? roleFilter : "";
  const hasFilter = Boolean(q || validRoleFilter);

  let users;
  let unfilteredTotal = 0;
  try {
    if (hasFilter) {
      users = await listAllAuthUsers();
      unfilteredTotal = users.length;
    } else {
      const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: pageSize,
      });
      if (listErr) {
        return NextResponse.json({ error: listErr.message }, { status: 500 });
      }
      users = listData.users ?? [];
      unfilteredTotal = listData.total ?? users.length;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list users.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const ids = users.map((u) => u.id);
  let profiles: Record<
    string,
    {
      username: string | null;
      full_name: string | null;
      role: Role | null;
      xp: number;
      level: number;
      created_at: string;
    }
  > = {};
  let lastStudyDates: Record<string, string | null> = {};

  if (ids.length > 0) {
    const { data: profRows, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, role, xp, level, created_at")
      .in("id", ids);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    profiles = Object.fromEntries(
      (profRows ?? []).map((p) => [
        p.id as string,
        {
          ...p,
          role: isRole(p.role) ? p.role : null,
        } as (typeof profiles)[string],
      ])
    );

    const { data: activityRows } = await supabaseAdmin
      .from("profiles")
      .select("id, last_study_date")
      .in("id", ids);
    lastStudyDates = Object.fromEntries(
      (activityRows ?? []).map((p) => [p.id as string, (p.last_study_date as string | null) ?? null])
    );
  }

  let rows = users.map((u) => {
    const p = profiles[u.id];
    const email = u.email ?? "";
    return {
      id: u.id,
      email,
      username: p?.username ?? null,
      full_name: p?.full_name ?? null,
      role: p?.role ?? "unassigned",
      xp: p?.xp ?? 0,
      level: p?.level ?? 0,
      last_study_date: lastStudyDates[u.id] ?? null,
      created_at: p?.created_at ?? u.created_at,
      profile_missing: !p,
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
  if (validRoleFilter) {
    rows = rows.filter((r) => r.role === validRoleFilter);
  }

  const total = hasFilter ? rows.length : unfilteredTotal;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageRows = hasFilter ? rows.slice((safePage - 1) * pageSize, safePage * pageSize) : rows;

  return NextResponse.json({
    users: pageRows,
    page: safePage,
    pageSize,
    total,
  });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    fullName?: string;
    role?: string;
    password?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const fullName = body?.fullName?.trim() ?? "";
  const role = body?.role as Role | undefined;
  const password = body?.password?.trim() || email;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const username = email.split("@")[0] || "user";
  const displayName = fullName || username;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName, username, role },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Failed to create user." }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: data.user.id,
    username,
    full_name: displayName,
    role,
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, "create_user", "user", data.user.id, { email, role });

  return NextResponse.json({
    user: {
      id: data.user.id,
      email,
      username,
      full_name: displayName,
      role,
      xp: 0,
      level: 0,
      last_study_date: null,
      created_at: data.user.created_at,
    },
  });
}
