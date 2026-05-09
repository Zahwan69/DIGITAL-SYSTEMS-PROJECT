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

async function getOwnedClass(classId: string, teacherId: string) {
  const { data, error } = await supabaseAdmin
    .from("classes")
    .select("id, name, join_code, created_at, subject_id")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  return { data, error };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId } = await params;
  const { data, error } = await getOwnedClass(classId, auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Class not found or not owned by you." },
      { status: 404 }
    );
  }

  return NextResponse.json({ class: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId } = await params;
  const { data: ownedClass, error: classError } = await getOwnedClass(classId, auth.userId);
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!ownedClass) {
    return NextResponse.json({ error: "Class not found or not owned by you." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    subjectId?: string | null;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Class name is required." }, { status: 400 });
  }

  const subjectId =
    typeof body?.subjectId === "string" && body.subjectId.trim() ? body.subjectId.trim() : null;

  if (subjectId) {
    const { data: link, error: linkError } = await supabaseAdmin
      .from("teacher_subjects")
      .select("subject_id")
      .eq("teacher_id", auth.userId)
      .eq("subject_id", subjectId)
      .maybeSingle();
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
    if (!link) return NextResponse.json({ error: "Subject is not available for this teacher." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("classes")
    .update({ name, subject_id: subjectId })
    .eq("id", classId)
    .eq("teacher_id", auth.userId)
    .select("id, name, join_code, created_at, subject_id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update class." }, { status: 500 });
  }

  return NextResponse.json({ class: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId } = await params;
  const { data: ownedClass, error: classError } = await getOwnedClass(classId, auth.userId);
  if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
  if (!ownedClass) {
    return NextResponse.json({ error: "Class not found or not owned by you." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("teacher_id", auth.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
