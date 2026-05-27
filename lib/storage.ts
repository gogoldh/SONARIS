import type { AnalysisResult, PendingAnalysisInput } from "@/types/analysis";

const PENDING_KEY = "sonaris.pending.analysis";
const RESULT_KEY = "sonaris.analysis.result";

let pendingMemory: PendingAnalysisInput | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}

export function savePendingInput(payload: PendingAnalysisInput): void {
  pendingMemory = payload;

  if (!canUseStorage()) return;

  try {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(payload));
    // If persisted successfully, prefer storage-backed state.
    pendingMemory = null;
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      throw error;
    }

    // Best-effort fallback: persist a lightweight record and keep the full
    // payload in memory for this tab session.
    const lightweightPayload: PendingAnalysisInput = {
      fileName: payload.fileName,
      age: payload.age,
      thresholdsLeft: payload.thresholdsLeft,
      thresholdsRight: payload.thresholdsRight,
    };

    try {
      window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(lightweightPayload));
    } catch {
      // Ignore secondary persistence failures; in-memory fallback still works.
    }
  }
}

export function readPendingInput(): PendingAnalysisInput | null {
  if (canUseStorage()) {
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (raw) {
      try {
        const persisted = JSON.parse(raw) as PendingAnalysisInput;

        // Merge image data from memory when lightweight fallback was used.
        if (!persisted.imageDataUrl && pendingMemory?.imageDataUrl && pendingMemory.fileName === persisted.fileName) {
          return { ...persisted, imageDataUrl: pendingMemory.imageDataUrl };
        }

        return persisted;
      } catch {
        return pendingMemory;
      }
    }
  }

  return pendingMemory;
}

export function clearPendingInput(): void {
  pendingMemory = null;
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