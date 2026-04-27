import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const body = (await request.json().catch(() => null)) as {
    joinCode?: string;
  } | null;
  const joinCode = body?.joinCode?.trim().toUpperCase();
  if (!joinCode) {
    return NextResponse.json({ error: "joinCode is required." }, { status: 400 });
  }

  const { data: classRow } = await supabaseAdmin
    .from("classes")
    .select("id, name, join_code, teacher_id")
    .eq("join_code", joinCode)
    .maybeSingle();

  if (!classRow) {
    return NextResponse.json({ error: "Invalid join code." }, { status: 404 });
  }

  if (classRow.teacher_id === auth.userId) {
    return NextResponse.json(
      { error: "You cannot join a class you own." },
      { status: 400 }
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("class_members")
    .select("id")
    .eq("class_id", classRow.id)
    .eq("student_id", auth.userId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      class: { id: classRow.id, name: classRow.name },
      alreadyMember: true,
    });
  }

  const { error: insertError } = await supabaseAdmin
    .from("class_members")
    .insert({
      class_id: classRow.id,
      student_id: auth.userId,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("class_invites")
    .update({ status: "accepted" })
    .eq("class_id", classRow.id)
    .eq("student_id", auth.userId)
    .eq("status", "pending");

  return NextResponse.json({
    class: { id: classRow.id, name: classRow.name },
    alreadyMember: false,
  });
}
