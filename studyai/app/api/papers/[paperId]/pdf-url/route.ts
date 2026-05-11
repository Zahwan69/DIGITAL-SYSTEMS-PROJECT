import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  id: string;
  uploaded_by: string;
  file_url: string | null;
};

async function canAccessAssignedPaper(userId: string, paperId: string) {
  const { data: memberships, error: memberError } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", userId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const classIds = (memberships ?? []).map((membership) => membership.class_id);
  if (classIds.length === 0) return false;

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("paper_id", paperId)
    .in("class_id", classIds)
    .limit(1);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  return Boolean(assignments?.length);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { paperId } = await params;

  const { data: paper, error: paperError } = await supabaseAdmin
    .from("past_papers")
    .select("id, uploaded_by, file_url")
    .eq("id", paperId)
    .maybeSingle<PaperRow>();

  if (paperError) {
    return NextResponse.json({ error: paperError.message }, { status: 500 });
  }

  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", auth.userId)
    .maybeSingle();

  const isUploader = paper.uploaded_by === auth.userId;
  const isAdmin = profile?.role === "admin";
  let hasAssignmentAccess = false;

  if (!isUploader && !isAdmin) {
    try {
      hasAssignmentAccess = await canAccessAssignedPaper(auth.userId, paperId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "access check failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!isUploader && !isAdmin && !hasAssignmentAccess) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  if (!paper.file_url) {
    return NextResponse.json({ url: null });
  }

  const { data: signed, error: signedError } = await supabaseAdmin.storage
    .from("question-papers")
    .createSignedUrl(paper.file_url, 60 * 60);

  if (signedError) {
    return NextResponse.json({ error: signedError.message }, { status: 500 });
  }

  return NextResponse.json({ url: signed?.signedUrl ?? null });
}
