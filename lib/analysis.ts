import type { AnalysisResult, CriterionEvaluation, EarThresholds, PendingAnalysisInput } from "@/types/analysis";

const DISCLAIMER_TEXT =
  "This output is decision support only and is not a medical diagnosis. Clinical judgment and full patient context remain essential.";

const DEFAULT_LEFT: EarThresholds = [35, 45, 55, 60];
const DEFAULT_RIGHT: EarThresholds = [30, 40, 50, 55];

function clampThresholds(values: number[] | undefined, fallback: EarThresholds): EarThresholds {
  if (!values || values.length !== 4) {
    return fallback;
  }

  const normalized = values.map((value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return 0;
    }
    return Math.max(0, Math.min(130, Math.round(numeric)));
  });

  return [normalized[0], normalized[1], normalized[2], normalized[3]];
}

function estimateFromFilename(fileName: string, side: "left" | "right"): EarThresholds {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("profound")) {
    return side === "left" ? [85, 90, 100, 105] : [80, 88, 98, 102];
  }
  if (normalized.includes("severe")) {
    return side === "left" ? [70, 75, 82, 88] : [68, 73, 80, 86];
  }
  if (normalized.includes("mild")) {
    return side === "left" ? [26, 30, 34, 37] : [25, 30, 33, 36];
  }
  if (normalized.includes("normal")) {
    return side === "left" ? [10, 12, 15, 17] : [10, 11, 14, 16];
  }

  return side === "left" ? DEFAULT_LEFT : DEFAULT_RIGHT;
}

function pta(thresholds: EarThresholds): number {
  const sum = thresholds.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / thresholds.length) * 10) / 10;
}

function classify(overallPta: number): AnalysisResult["classification"] {
  if (overallPta <= 25) return "Normal";
  if (overallPta <= 40) return "Mild hearing loss";
  if (overallPta <= 60) return "Moderate hearing loss";
  if (overallPta <= 80) return "Severe hearing loss";
  return "Profound hearing loss";
}

function hasAsymmetry(left: EarThresholds, right: EarThresholds): boolean {
  const differences = left.map((value, index) => Math.abs(value - right[index]));
  const significant = differences.filter((difference) => difference >= 20);
  return significant.length >= 2;
}

export function analyzeHearingLoss(input: PendingAnalysisInput): AnalysisResult {
  const hasProvidedThresholds =
    Array.isArray(input.thresholdsLeft) &&
    input.thresholdsLeft.length === 4 &&
    Array.isArray(input.thresholdsRight) &&
    input.thresholdsRight.length === 4;

  const left = clampThresholds(
    hasProvidedThresholds ? input.thresholdsLeft : undefined,
    estimateFromFilename(input.fileName, "left"),
  );

  const right = clampThresholds(
    hasProvidedThresholds ? input.thresholdsRight : undefined,
    estimateFromFilename(input.fileName, "right"),
  );

  const ptaLeft = pta(left);
  const ptaRight = pta(right);
  const ptaOverall = Math.round((((ptaLeft + ptaRight) / 2) * 10)) / 10;
  const classification = classify(ptaOverall);
  const age = typeof input.age === "number" && input.age > 0 ? input.age : undefined;

  const severeBilateral = ptaLeft >= 70 && ptaRight >= 70;
  const asymmetry = hasAsymmetry(left, right);
  const pediatricConcern = Boolean(age && age < 18 && (ptaLeft >= 55 || ptaRight >= 55));

  const criteria: CriterionEvaluation[] = [
    {
      key: "WHO",
      title: "WHO severity class",
      met: true,
      detail: `Overall PTA is ${ptaOverall} dB HL, classified as ${classification.toLowerCase()}.`,
    },
    {
      key: "RIZIV",
      title: "RIZIV severe bilateral screening flag",
      met: severeBilateral,
      detail: severeBilateral
        ? "Both ears are >= 70 dB HL average threshold, which aligns with severe bilateral referral screening flags."
        : "Bilateral severe threshold flag is not met.",
    },
    {
      key: "ASYMMETRY",
      title: "Inter-ear asymmetry check",
      met: asymmetry,
      detail: asymmetry
        ? "At least two tested frequencies differ by >= 20 dB between ears."
        : "No major inter-ear asymmetry detected by the screening rule.",
    },
    {
      key: "PEDIATRIC",
      title: "Pediatric caution",
      met: pediatricConcern,
      detail: pediatricConcern
        ? "Patient is under 18 with at least moderate-to-severe thresholds; specialist review is advised."
        : "No additional pediatric caution flag detected by current rules.",
    },
  ];

  const referralRecommended = severeBilateral || asymmetry || pediatricConcern;
  const referralReason = referralRecommended
    ? "Referral to a specialized university hospital is recommended based on the selected screening criteria."
    : "No immediate specialist referral is flagged by these screening rules; continue standard follow-up and clinical review.";

  const summary =
    classification === "Normal"
      ? "Thresholds are within normal range in this screening profile."
      : `Screening indicates ${classification.toLowerCase()} with an overall PTA of ${ptaOverall} dB HL.`;

  return {
    classification,
    summary,
    referralRecommended,
    referralReason,
    criteria,
    disclaimer: DISCLAIMER_TEXT,
    generatedAt: new Date().toISOString(),
    confidence: hasProvidedThresholds ? "provided-thresholds" : "estimated-thresholds",
    measurements: {
      leftEar: left,
      rightEar: right,
      ptaLeft,
      ptaRight,
      ptaOverall,
      age,
    },
  };
}