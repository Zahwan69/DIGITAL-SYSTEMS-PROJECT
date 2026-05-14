import "server-only";

import { NextResponse } from "next/server";

import {
  authenticateRequest,
  SUPERADMIN_ROLES,
} from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * A user's effective permission set is the union of two sources:
 *   1. role_default_permissions for their profile.role (legacy 'admin' is
 *      treated as 'superadmin').
 *   2. user_extra_permissions granted individually (e.g. administration
 *      handing a teacher classes.create).
 *
 * Superadmin always returns a sentinel wildcard set that satisfies any
 * hasPermission check without a database lookup.
 */
type RoleRow = { role: string | null };
type PermissionRow = { permission_key: string };

export async function effectivePermissions(userId: string): Promise<Set<string>> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<RoleRow>();

  const role = profile?.role ?? null;
  if (role && SUPERADMIN_ROLES.has(role)) {
    return new Set(["*"]);
  }

  const lookupRole = role ?? "student";

  const [{ data: defaults }, { data: extras }] = await Promise.all([
    supabaseAdmin
      .from("role_default_permissions")
      .select("permission_key")
      .eq("role", lookupRole),
    supabaseAdmin
      .from("user_extra_permissions")
      .select("permission_key")
      .eq("user_id", userId),
  ]);

  const set = new Set<string>();
  for (const row of (defaults ?? []) as PermissionRow[]) set.add(row.permission_key);
  for (const row of (extras ?? []) as PermissionRow[]) set.add(row.permission_key);
  return set;
}

export async function hasPermission(userId: string, key: string): Promise<boolean> {
  const set = await effectivePermissions(userId);
  return set.has("*") || set.has(key);
}

export type GuardOk = { ok: true; userId: string };
export type GuardErr = { ok: false; response: NextResponse };

/**
 * Combined auth + permission gate for API route handlers.
 *
 *   const guard = await requirePermission(request, "classes.create");
 *   if (!guard.ok) return guard.response;
 *
 * Returns 401 if the caller isn't signed in and 403 if they lack the key.
 */
export async function requirePermission(
  request: Request,
  key: string
): Promise<GuardOk | GuardErr> {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: auth.message }, { status: auth.status }),
    };
  }
  if (!(await hasPermission(auth.userId, key))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Forbidden.", missingPermission: key },
        { status: 403 }
      ),
    };
  }
  return { ok: true, userId: auth.userId };
}
