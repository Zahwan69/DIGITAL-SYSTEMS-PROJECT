import { NextResponse } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { authenticateRequest, requireAdmin } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id, name, syllabus_code, level, created_at")
    .order("name", { ascending: true });

  if (error) {
    if (error.message.toLowerCase().includes("relation") || error.code === "42P01") {
      return NextResponse.json({ subjects: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subjects: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!(await requireAdmin(auth.userId))) {
    return new NextResponse(null, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    syllabus_code?: string | null;
    level?: string | null;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const syllabus_code = body?.syllabus_code?.trim() || null;
  const level = body?.level?.trim() || null;

  const { data, error } = await supabaseAdmin
    .from("subjects")
    .insert({ name, syllabus_code, level })
    .select("id, name, syllabus_code, level, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(auth.userId, "create_subject", "subject", data.id as string, {
    name,
    syllabus_code,
    level,
  });

  return NextResponse.json({ subject: data });
}
