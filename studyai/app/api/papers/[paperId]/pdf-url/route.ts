import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { resolvePaperAccess } from "@/lib/assignment-access";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  id: string;
  uploaded_by: string;
  file_url: string | null;
};

/**
 * On the practice path, no role gets a direct signed PDF URL anymore. The
 * page-image route is the only render surface. Existing callers expect
 * `{ url, restricted? }` so we keep that shape and always return restricted.
 */
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

  let access;
  try {
    access = await resolvePaperAccess(auth.userId, paper);
  } catch (error) {
    const message = error instanceof Error ? error.message : "access check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (!access.canRead) {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }

  return NextResponse.json({ url: null, restricted: true });
}
