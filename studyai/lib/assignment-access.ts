import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export type PaperAccessContext = {
  isUploader: boolean;
  isAdmin: boolean;
  isAssigningTeacher: boolean;
  isAssignedStudent: boolean;
  isAssigned: boolean;
  canRead: boolean;
  canDownloadOriginal: boolean;
};

/**
 * Returns true if the user is on either side of an assignment for this paper
 * (a student enrolled in a class that has it assigned, or a teacher of such
 * a class).
 */
export async function canAccessThroughAssignment(
  userId: string,
  paperId: string
): Promise<boolean> {
  const [{ data: memberships, error: memberError }, { data: taughtClasses, error: taughtError }] =
    await Promise.all([
      supabaseAdmin.from("class_members").select("class_id").eq("student_id", userId),
      supabaseAdmin.from("classes").select("id").eq("teacher_id", userId),
    ]);

  if (memberError) throw new Error(memberError.message);
  if (taughtError) throw new Error(taughtError.message);

  const classIds = Array.from(
    new Set([
      ...(memberships ?? []).map((m) => m.class_id),
      ...(taughtClasses ?? []).map((c) => c.id),
    ])
  );
  if (classIds.length === 0) return false;

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("paper_id", paperId)
    .in("class_id", classIds)
    .limit(1);
  if (assignmentError) throw new Error(assignmentError.message);

  return Boolean(assignments?.length);
}

/**
 * Strictly student-side: is this paper assigned to a class this user is a
 * member of? Teachers/admins do not count, even if they own the class.
 * This is the signal we use to switch the helper chat to hint-only.
 */
export async function isPaperAssignedToStudent(
  userId: string,
  paperId: string
): Promise<boolean> {
  const { data: memberships, error: memberError } = await supabaseAdmin
    .from("class_members")
    .select("class_id")
    .eq("student_id", userId);
  if (memberError) throw new Error(memberError.message);

  const classIds = (memberships ?? []).map((m) => m.class_id);
  if (classIds.length === 0) return false;

  const { data: assignments, error: assignmentError } = await supabaseAdmin
    .from("assignments")
    .select("id")
    .eq("paper_id", paperId)
    .in("class_id", classIds)
    .limit(1);
  if (assignmentError) throw new Error(assignmentError.message);

  return Boolean(assignments?.length);
}

/**
 * Resolve the full access context for a (user, paper) pair. Returns the
 * caller flags plus convenience booleans used by the paper detail and
 * pdf-url routes.
 */
export async function resolvePaperAccess(
  userId: string,
  paper: { id: string; uploaded_by: string }
): Promise<PaperAccessContext> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const isUploader = paper.uploaded_by === userId;
  const isAdmin = profile?.role === "admin";

  let isAssigningTeacher = false;
  let isAssignedStudent = false;

  if (!isUploader && !isAdmin) {
    const [{ data: taughtClasses, error: taughtError }, { data: memberships, error: memberError }] =
      await Promise.all([
        supabaseAdmin.from("classes").select("id").eq("teacher_id", userId),
        supabaseAdmin.from("class_members").select("class_id").eq("student_id", userId),
      ]);
    if (taughtError) throw new Error(taughtError.message);
    if (memberError) throw new Error(memberError.message);

    const taughtClassIds = (taughtClasses ?? []).map((c) => c.id);
    const memberClassIds = (memberships ?? []).map((m) => m.class_id);

    if (taughtClassIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .eq("paper_id", paper.id)
        .in("class_id", taughtClassIds)
        .limit(1);
      if (error) throw new Error(error.message);
      isAssigningTeacher = Boolean(data?.length);
    }

    if (memberClassIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from("assignments")
        .select("id")
        .eq("paper_id", paper.id)
        .in("class_id", memberClassIds)
        .limit(1);
      if (error) throw new Error(error.message);
      isAssignedStudent = Boolean(data?.length);
    }
  }

  const canRead = isUploader || isAdmin || isAssigningTeacher || isAssignedStudent;
  // For this MVP phase, no one gets the direct download URL on the practice
  // path. Page-image viewer is the single rendering surface. Role-aware
  // download will return when permissions are restructured.
  const canDownloadOriginal = false;

  return {
    isUploader,
    isAdmin,
    isAssigningTeacher,
    isAssignedStudent,
    isAssigned: isAssignedStudent,
    canRead,
    canDownloadOriginal,
  };
}
