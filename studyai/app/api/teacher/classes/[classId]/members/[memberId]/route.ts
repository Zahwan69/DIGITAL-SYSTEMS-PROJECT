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
  { params }: { params: Promise<{ classId: string; memberId: string }> }
) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId, memberId } = await params;
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

  const { data: member, error: memberError } = await supabaseAdmin
    .from("class_members")
    .select("id")
    .eq("id", memberId)
    .eq("class_id", classId)
    .maybeSingle();

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Class member not found." }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("class_members")
    .delete()
    .eq("id", memberId)
    .eq("class_id", classId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
