import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function logAdminAction(
  actorId: string,
  action: string,
  targetType: "user" | "paper" | "subject",
  targetId: string | null,
  metadata: Record<string, unknown> = {}
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
}
