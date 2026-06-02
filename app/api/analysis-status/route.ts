import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { AnalysisRecord } from "@/lib/analysis-record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_TABLE = "scans_research";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function parseId(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = parseId(url.searchParams.get("id"));

    if (id === null) {
      return NextResponse.json({ ready: false }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id,image_url,left_pta,right_pta,ai_confidence,riziv_matched")
      .eq("id", id)
      .maybeSingle<AnalysisRecord>();

    if (error) {
      console.error("Supabase analysis-status lookup failed", {
        id,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ ready: false }, { status: 200 });
    }

    const ready = data.left_pta !== null && data.left_pta !== undefined;

    // Normalize ai_confidence to a percentage number when possible.
    function normalizeConfidence(v: unknown): number | null {
      if (v === null || v === undefined) return null;
      if (typeof v === "number") {
        if (v === -1) return -1;
        return v >= 0 && v <= 1 ? v * 100 : v;
      }
      if (typeof v === "string") {
        const n = Number(v);
        if (Number.isNaN(n)) return null;
        if (n === -1) return -1;
        return n >= 0 && n <= 1 ? n * 100 : n;
      }
      return null;
    }

    const conf = normalizeConfidence(data.ai_confidence);

    // Error condition 2: sentinel -1 means "not a valid audiogram"
    if (conf === -1) {
      return NextResponse.json({ ready: true, error: "Dit is geen geldig audiogram." }, { status: 200 });
    }

    // If left PTA is still null, but ai_confidence indicates low confidence (<65%), return an explicit error
    if ((data.left_pta === null || data.left_pta === undefined) && conf !== null && conf > 0 && conf < 65) {
      const rounded = Math.round(conf);
      return NextResponse.json(
        {
          ready: true,
          error: `De AI-scan was niet betrouwbaar genoeg (confidence ${rounded}%). Upload aangeraden van een scherpere afbeelding.`,
        },
        { status: 200 },
      );
    }

    // Still processing: left_pta not set yet and no low-confidence error
    if (!ready) {
      return NextResponse.json({ ready: false }, { status: 200 });
    }

    // Success: left_pta is present
    return NextResponse.json({ ready: true, data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
