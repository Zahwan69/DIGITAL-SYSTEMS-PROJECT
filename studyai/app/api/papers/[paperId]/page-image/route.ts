import { NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/api-auth";
import { resolvePaperAccess } from "@/lib/assignment-access";
import { getPdfPageCount, renderPdfPageToPng } from "@/lib/pdf-render";
import { supabaseAdmin } from "@/lib/supabase/admin";

type PaperRow = {
  id: string;
  uploaded_by: string;
  file_url: string | null;
};

async function loadPaperBytes(filePath: string): Promise<Uint8Array | null> {
  const { data, error } = await supabaseAdmin.storage
    .from("question-papers")
    .download(filePath);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { paperId } = await params;
  const url = new URL(request.url);
  const infoOnly = url.searchParams.get("info") === "1";
  const pageRaw = url.searchParams.get("page");
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;

  if (!infoOnly && (!Number.isFinite(page) || page < 1)) {
    return NextResponse.json({ error: "page must be a positive integer." }, { status: 400 });
  }

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

  if (!paper.file_url) {
    return NextResponse.json(
      { error: "Original paper was not archived for this paper." },
      { status: 404 }
    );
  }

  const pdfBytes = await loadPaperBytes(paper.file_url);
  if (!pdfBytes) {
    return NextResponse.json(
      { error: "Could not load original paper from storage." },
      { status: 502 }
    );
  }

  if (infoOnly) {
    try {
      const pageCount = await getPdfPageCount(pdfBytes);
      return NextResponse.json({ pageCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : "page count failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  try {
    const pageCount = await getPdfPageCount(pdfBytes);
    if (page > pageCount) {
      return NextResponse.json(
        { error: `page ${page} is out of range (1-${pageCount}).` },
        { status: 400 }
      );
    }

    const png = await renderPdfPageToPng(pdfBytes, page, 2);
    return new Response(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
        "X-Pdf-Page-Count": String(pageCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "page render failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
