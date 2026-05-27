export type EarThresholds = [number, number, number, number];

export type CriterionEvaluation = {
  key: "WHO" | "RIZIV" | "ASYMMETRY" | "PEDIATRIC";
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
  classification: "Normal" | "Mild hearing loss" | "Moderate hearing loss" | "Severe hearing loss" | "Profound hearing loss";
  summary: string;
  referralRecommended: boolean;
  referralReason: string;
  criteria: CriterionEvaluation[];
  disclaimer: string;
  generatedAt: string;
  confidence: "provided-thresholds" | "estimated-thresholds";
  measurements: {
    leftEar: EarThresholds;
    rightEar: EarThresholds;
    ptaLeft: number;
    ptaRight: number;
    ptaOverall: number;
    age?: number;
  };
};