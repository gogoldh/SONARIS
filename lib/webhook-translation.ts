import type { AnalysisResult } from "@/types/analysis";

const WEBHOOK_TRANSLATIONS: Array<[RegExp, string]> = [
  [/^Patiënt voldoet momenteel niet aan de minimale RIZIV-criteria voor een CI-traject\.?$/i, "The patient does not currently meet the minimum RIZIV criteria for a cochlear implant pathway."],
  [/^Patiënt voldoet momenteel wel aan de minimale RIZIV-criteria voor een CI-traject\.?$/i, "The patient currently meets the minimum RIZIV criteria for a cochlear implant pathway."],
  [/\bPatiënt\b/gi, "Patient"],
  [/\bvoldoet momenteel niet aan de minimale\b/gi, "does not currently meet the minimum"],
  [/\bvoldoet momenteel wel aan de minimale\b/gi, "currently meets the minimum"],
  [/\bcriteria voor een CI-traject\b/gi, "criteria for a cochlear implant pathway"],
  [/\bvoor een CI-traject\b/gi, "for a cochlear implant pathway"],
  [/\bminimale RIZIV-criteria\b/gi, "minimum RIZIV criteria"],
  [/\bRIZIV-criteria\b/gi, "RIZIV criteria"],
];

export function translateWebhookText(value: string): string {
  return WEBHOOK_TRANSLATIONS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value);
}

export function translateAnalysisResult(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    classification: translateWebhookText(result.classification) as AnalysisResult["classification"],
    summary: translateWebhookText(result.summary),
    referralReason: translateWebhookText(result.referralReason),
    disclaimer: translateWebhookText(result.disclaimer),
    criteria: result.criteria.map((item) => ({
      ...item,
      title: translateWebhookText(item.title),
      detail: translateWebhookText(item.detail),
    })),
  };
}
