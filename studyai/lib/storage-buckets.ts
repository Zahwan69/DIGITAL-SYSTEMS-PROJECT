import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

const ensured = new Set<string>();

/**
 * Ensure a Supabase storage bucket exists. Idempotent and memoised — only
 * one round-trip on the first call per server process.
 *
 * Throws on creation failure so the API route can surface the error
 * instead of silently producing rows with null image_url values.
 */
export async function ensureBucket(name: string, options: { public: boolean }): Promise<void> {
  if (ensured.has(name)) return;

  const { data: existing } = await supabaseAdmin.storage.getBucket(name);
  if (existing) {
    ensured.add(name);
    return;
  }

  const { error } = await supabaseAdmin.storage.createBucket(name, {
    public: options.public,
  });
  if (error) {
    // "already exists" can race when two requests bootstrap concurrently — treat as success
    if (/already exists/i.test(error.message)) {
      ensured.add(name);
      return;
    }
    throw new Error(`Failed to create storage bucket "${name}": ${error.message}`);
  }
  ensured.add(name);
}
