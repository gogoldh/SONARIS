import { NextResponse } from "next/server";

import { analyzeHearingLoss } from "@/lib/analysis";
import type { PendingAnalysisInput } from "@/types/analysis";

function isValidThresholdArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 4 && value.every((item) => typeof item === "number");
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PendingAnalysisInput;

    if (!payload.fileName || typeof payload.fileName !== "string") {
      return NextResponse.json({ error: "Invalid input: file name is required." }, { status: 400 });
    }

    if (payload.thresholdsLeft && !isValidThresholdArray(payload.thresholdsLeft)) {
      return NextResponse.json({ error: "Invalid left-ear thresholds." }, { status: 400 });
    }

    if (payload.thresholdsRight && !isValidThresholdArray(payload.thresholdsRight)) {
      return NextResponse.json({ error: "Invalid right-ear thresholds." }, { status: 400 });
    }

    const result = analyzeHearingLoss(payload);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to process the scan." }, { status: 500 });
  }
}