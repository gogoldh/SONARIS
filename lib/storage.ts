import type { AnalysisResult, PendingAnalysisInput } from "@/types/analysis";

const PENDING_KEY = "sonaris.pending.analysis";
const RESULT_KEY = "sonaris.analysis.result";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function savePendingInput(payload: PendingAnalysisInput): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
}

export function readPendingInput(): PendingAnalysisInput | null {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAnalysisInput;
  } catch {
    return null;
  }
}

export function clearPendingInput(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(PENDING_KEY);
}

export function saveAnalysisResult(result: AnalysisResult): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function readAnalysisResult(): AnalysisResult | null {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    return null;
  }
}

export function clearAnalysisResult(): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(RESULT_KEY);
}