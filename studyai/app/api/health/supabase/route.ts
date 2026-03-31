import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin.storage.listBuckets();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "Supabase connection failed.",
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Supabase connection is working.",
    bucketCount: data.length,
  });
}
