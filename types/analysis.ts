export type EarThresholds = [number, number, number, number];

export type CriterionEvaluation = {
  key: string;
  title: string;
  met: boolean;
  detail: string;
};

export type PendingAnalysisInput = {
  fileName: string;
  imageDataUrl?: string;
  age?: number;
  thresholdsLeft?: number[];
  thresholdsRight?: number[];
};

export type AnalysisResult = {
  classification:
    | "Normal"
    | "Mild hearing loss"
    | "Moderate hearing loss"
    | "Severe hearing loss"
    | "Profound hearing loss"
    | "RIZIV criteria matched"
    | "RIZIV criteria not met";
  summary: string;
  referralRecommended: boolean;
  referralReason: string;
  criteria: CriterionEvaluation[];
  disclaimer: string;
  generatedAt: string;
  confidence: "provided-thresholds" | "estimated-thresholds" | "webhook";
  measurements: {
    leftEar: EarThresholds;
    rightEar: EarThresholds;
    ptaLeft: number;
    ptaRight: number;
    ptaOverall: number;
    age?: number;
  };
};