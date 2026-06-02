import type { AnalysisResult, CriterionEvaluation, EarThresholds } from "@/types/analysis";

export type AnalysisRecord = {
  id: number | string;
  image_url?: string | null;
  left_pta?: number | null;
  right_pta?: number | null;
  ai_confidence?: number | string | null;
  riziv_matched?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  result_json?: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function normalizeEarFromPta(pta: number): EarThresholds {
  const normalized = Math.max(0, Math.round(pta));
  return [normalized, normalized, normalized, normalized];
}

function classify(overallPta: number): AnalysisResult["classification"] {
  if (overallPta <= 25) return "Normal";
  if (overallPta <= 40) return "Mild hearing loss";
  if (overallPta <= 60) return "Moderate hearing loss";
  if (overallPta <= 80) return "Severe hearing loss";
  return "Profound hearing loss";
}

function buildCriteria(record: AnalysisRecord, leftPta: number, rightPta: number, overallPta: number): CriterionEvaluation[] {
  const ready = typeof record.left_pta === "number" && typeof record.right_pta === "number";
  const matched = Boolean(record.riziv_matched);
  const confidenceLabel =
    typeof record.ai_confidence === "number" || typeof record.ai_confidence === "string"
      ? String(record.ai_confidence)
      : "not reported";

  return [
    {
      key: "RECORD_READY",
      title: "Database row ready",
      met: ready,
      detail: ready
        ? `Record ${record.id} has been updated with finalized PTA values.`
        : `Record ${record.id} is still being processed by n8n.`,
    },
    {
      key: "LEFT_PTA",
      title: "Left PTA available",
      met: typeof record.left_pta === "number",
      detail: `Left PTA: ${leftPta} dB HL.`,
    },
    {
      key: "RIGHT_PTA",
      title: "Right PTA available",
      met: typeof record.right_pta === "number",
      detail: `Right PTA: ${rightPta} dB HL.`,
    },
    {
      key: "RIZIV_FLAG",
      title: "RIZIV match flag",
      met: matched,
      detail: matched
        ? "n8n marked this analysis as matching the RIZIV criteria."
        : "n8n did not mark this analysis as matching the RIZIV criteria.",
    },
    {
      key: "AI_CONFIDENCE",
      title: "AI confidence",
      met: typeof record.ai_confidence === "number" || typeof record.ai_confidence === "string",
      detail: `AI confidence reported by the workflow: ${confidenceLabel}.`,
    },
    {
      key: "OVERALL_PTA",
      title: "Overall PTA",
      met: overallPta > 0,
      detail: `Computed overall PTA: ${overallPta} dB HL.`,
    },
  ];
}

export function extractAnalysisRecordId(value: unknown): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractAnalysisRecordId(item);
      if (id !== null) {
        return id;
      }
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = toNumber(record.id);
  if (id !== null && id > 0) {
    return Math.trunc(id);
  }

  const nested = record.payload ?? record.result ?? record.analysis;
  return nested !== undefined ? extractAnalysisRecordId(nested) : null;
}

export function isAnalysisRecordReady(record: AnalysisRecord): boolean {
  return typeof record.left_pta === "number" && typeof record.right_pta === "number";
}

export function buildAnalysisResultFromRecord(record: AnalysisRecord, age?: number): AnalysisResult {
  const leftPta = toNumber(record.left_pta) ?? 0;
  const rightPta = toNumber(record.right_pta) ?? 0;
  const overallPta =
    leftPta > 0 && rightPta > 0
      ? Math.round((((leftPta + rightPta) / 2) * 10)) / 10
      : leftPta > 0
        ? leftPta
        : rightPta > 0
          ? rightPta
          : 0;
  const matched = Boolean(record.riziv_matched);
  const classification = matched ? "RIZIV criteria matched" : classify(overallPta);
  const generatedAt = record.updated_at || record.created_at || new Date().toISOString();

  const summary = matched
    ? `n8n marked record ${record.id} as matching the RIZIV criteria with a left PTA of ${leftPta} dB HL and right PTA of ${rightPta} dB HL.`
    : `Database analysis completed with an overall PTA of ${overallPta} dB HL.`;

  const referralRecommended = matched || overallPta >= 60;

  const referralReason = matched
    ? "n8n marked this case as a RIZIV match, so specialist referral is recommended."
    : overallPta >= 60
      ? "The PTA scores indicate a clinically significant hearing loss, so specialist follow-up is recommended."
      : "The workflow did not flag a RIZIV match and the PTA scores do not indicate an immediate referral flag.";

  return {
    classification,
    summary,
    referralRecommended,
    referralReason,
    criteria: buildCriteria(record, leftPta, rightPta, overallPta),
    disclaimer:
      "This output is decision support only and is not a medical diagnosis. Clinical judgment and full patient context remain essential.",
    generatedAt,
    confidence: "webhook",
    measurements: {
      leftEar: normalizeEarFromPta(leftPta),
      rightEar: normalizeEarFromPta(rightPta),
      ptaLeft: leftPta,
      ptaRight: rightPta,
      ptaOverall: overallPta,
      age,
    },
  };
}