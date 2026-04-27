import { NextResponse } from "next/server";

import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const { data: rows, error } = await supabaseAdmin
    .from("admin_audit_log")
    .select("id, actor_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    if (error.message.toLowerCase().includes("relation") || error.code === "42P01") {
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_id as string))];
  let names: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name")
      .in("id", actorIds);
    names = Object.fromEntries(
      (profs ?? []).map((p) => [
        p.id as string,
        ((p.full_name as string | null) || (p.username as string | null) || p.id) as string,
      ])
    );
  }

  const entries = (rows ?? []).map((r) => ({
    ...r,
    actor_label: names[r.actor_id as string] ?? r.actor_id,
  }));

  return NextResponse.json({ entries });
}
