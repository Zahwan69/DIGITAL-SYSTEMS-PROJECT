import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { inviteId } = await params;

  const body = (await request.json().catch(() => null)) as {
    action?: string;
  } | null;
  const action = body?.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "action must be 'accept' or 'decline'." },
      { status: 400 }
    );
  }

  const { data: invite } = await supabaseAdmin
    .from("class_invites")
    .select("id, class_id, student_id, status")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite || invite.student_id !== auth.userId) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }
  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "This invite has already been responded to." },
      { status: 409 }
    );
  }

  if (action === "decline") {
    const { error } = await supabaseAdmin
      .from("class_invites")
      .update({ status: "declined" })
      .eq("id", inviteId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: "declined" });
  }

  const { data: existingMember } = await supabaseAdmin
    .from("class_members")
    .select("id")
    .eq("class_id", invite.class_id)
    .eq("student_id", auth.userId)
    .maybeSingle();

  if (!existingMember) {
    const { error: insertError } = await supabaseAdmin
      .from("class_members")
      .insert({
        class_id: invite.class_id,
        student_id: auth.userId,
      });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("class_invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "accepted", classId: invite.class_id });
}
