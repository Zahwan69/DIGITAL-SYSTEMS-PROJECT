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

async function ensureAssignmentInClass(assignmentId: string, classId: string) {
  const { data, error } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("class_id", classId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

type RouteParams = { params: Promise<{ classId: string; assignmentId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId, assignmentId } = await params;
  try {
    if (!(await ensureClassOwner(classId, auth.userId))) {
      return NextResponse.json({ error: "Class not found or not owned by you." }, { status: 404 });
    }
    if (!(await ensureAssignmentInClass(assignmentId, classId))) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify assignment." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    paperId?: string;
    title?: string;
    instructions?: string | null;
    dueDate?: string | null;
  } | null;

  const title = body?.title?.trim();
  const paperId = body?.paperId?.trim();
  const instructions = body?.instructions?.trim() || null;
  const dueDate = body?.dueDate?.trim() ? body.dueDate : null;

  if (!title) return NextResponse.json({ error: "title is required." }, { status: 400 });
  if (!paperId) return NextResponse.json({ error: "paperId is required." }, { status: 400 });

  const { data: paper, error: paperError } = await supabaseAdmin
    .from("past_papers")
    .select("id")
    .eq("id", paperId)
    .maybeSingle();
  if (paperError) return NextResponse.json({ error: paperError.message }, { status: 500 });
  if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("assignments")
    .update({
      paper_id: paperId,
      title,
      instructions,
      due_date: dueDate,
    })
    .eq("id", assignmentId)
    .eq("class_id", classId)
    .select("id, paper_id, title, instructions, due_date, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to update assignment." }, { status: 500 });
  }

  return NextResponse.json({ assignment: data });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await assertTeacher(request);
  if (!auth.ok) return auth.response;

  const { classId, assignmentId } = await params;
  try {
    if (!(await ensureClassOwner(classId, auth.userId))) {
      return NextResponse.json({ error: "Class not found or not owned by you." }, { status: 404 });
    }
    if (!(await ensureAssignmentInClass(assignmentId, classId))) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify assignment." },
      { status: 500 }
    );
  }

  const { error } = await supabaseAdmin
    .from("assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("class_id", classId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
