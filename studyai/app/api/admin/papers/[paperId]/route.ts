import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { paperId } = await params;

  const { data: qRows } = await supabaseAdmin.from("questions").select("id").eq("paper_id", paperId);
  const qids = (qRows ?? []).map((q) => q.id);
  if (qids.length > 0) {
    await supabaseAdmin.from("attempts").delete().in("question_id", qids);
    await supabaseAdmin.from("questions").delete().eq("paper_id", paperId);
  }

  await supabaseAdmin.from("assignments").delete().eq("paper_id", paperId);

  const { error } = await supabaseAdmin.from("past_papers").delete().eq("id", paperId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(auth.userId, "delete_paper", "paper", paperId, {});

  return NextResponse.json({ ok: true });
}
