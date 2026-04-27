import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const { subjectId } = await params;

  const { error } = await supabaseAdmin.from("subjects").delete().eq("id", subjectId);

  if (error) {
    return NextResponse.json(
      { error: error.message.includes("foreign") ? "Subject is still linked to classes or teachers." : error.message },
      { status: 400 }
    );
  }

  await logAdminAction(auth.userId, "delete_subject", "subject", subjectId, {});

  return NextResponse.json({ ok: true });
}
