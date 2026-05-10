import { NextResponse } from "next/server";

import { authenticateRequest, requireTeacher } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function assertTeacher(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return { ok: false as const, response: NextResponse.json({ error: auth.message }, { status: auth.status }) };
  }

  if (!(await requireTeacher(auth.userId))) {
    return { ok: false as const, response: new NextResponse(null, { status: 403 }) };
  }

  return { ok: true as const, userId: auth.userId };
}

async function ensureClassOwner(classId: string, teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string; inviteId: string }> }
) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId, inviteId } = await params;
  try {
    if (!(await ensureClassOwner(classId, auth.userId))) {
      return NextResponse.json({ error: "Class not found or not owned by you." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify class." },
      { status: 500 }
    );
  }

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from("class_invites")
    .select("id")
    .eq("id", inviteId)
    .eq("class_id", classId)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "Pending invite not found." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("class_invites")
    .delete()
    .eq("id", inviteId)
    .eq("class_id", classId)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
