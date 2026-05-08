import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Role = "student" | "teacher" | "admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { userId } = await params;
  if (userId === auth.userId) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { role?: string } | null;
  const role = body?.role as Role | undefined;
  if (!role || !["student", "teacher", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("profiles").update({ role }).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, "set_user_role", "user", userId, { role });

  return NextResponse.json({ ok: true });
}
