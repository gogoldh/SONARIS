import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_TABLE = "scans_research";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function normalizeConfidence(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (value === -1) return -1;
    return value >= 0 && value <= 1 ? value * 100 : value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (parsed === -1) return -1;
    return parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Geen ID meegegeven" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { ready: true, error: "Server crash: Supabase environment variables ontbreken." },
        { headers: NO_STORE_HEADERS },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const numericId = Number.parseInt(id, 10);

    if (!Number.isFinite(numericId) || numericId <= 0) {
      return NextResponse.json(
        { ready: true, error: `Ongeldig ID ontvangen: ${id}` },
        { headers: NO_STORE_HEADERS },
      );
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id,left_pta,right_pta,riziv_matched,ai_confidence,created_at,updated_at")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      console.error("Supabase leesfout:", error);
      return NextResponse.json(
        {
          ready: true,
          error: `Supabase fout: ${error.message}. Code: ${error.code}. Verzocht ID: ${id}`,
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    console.log(`Huidige live data in DB voor ID ${id}:`, data);

    if (!data) {
      return NextResponse.json(
        { ready: false, message: "Record wordt geïnitialiseerd..." },
        { headers: NO_STORE_HEADERS },
      );
    }

    const confidence = normalizeConfidence(data.ai_confidence);
    if (confidence === -1 || (confidence !== null && confidence < 65 && data.left_pta === null)) {
      return NextResponse.json(
        {
          ready: true,
          error: "Dit is geen geldig of scherp genoeg audiogram.",
        },
        { headers: NO_STORE_HEADERS },
      );
    }

    if (data.left_pta !== null || data.right_pta !== null || data.riziv_matched !== null) {
      console.log("Data is binnen! Polling stopt.");
      return NextResponse.json({ ready: true, data }, { headers: NO_STORE_HEADERS });
    }

    return NextResponse.json(
      { ready: false, message: "AI is het audiogram aan het digitaliseren..." },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Server crash in status route:", error);
    return NextResponse.json(
      { ready: true, error: message },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}
