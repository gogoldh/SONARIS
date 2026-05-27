"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { analyzeHearingLoss } from "@/lib/analysis";
import { clearPendingInput, readPendingInput, saveAnalysisResult } from "@/lib/storage";
import type { AnalysisResult } from "@/types/analysis";

function encodeReason(message: string): string {
  return encodeURIComponent(message);
}

function isNoAudiogramMessage(value: unknown): boolean {
  return typeof value === "string" && /no audiogram provided/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

type N8nWebhookResult = {
  rizivCriteriaMatched?: boolean;
  leftPTAUsed?: number;
  rightPTAUsed?: number;
  thresholdChecked?: number;
  recommendation?: string;
  extractedCriteriaSummary?: string;
  checkedAt?: string;
};

type ParsedWebhookResponse = {
  success?: boolean;
  error?: string;
  payload?: unknown;
  result?: unknown;
  analysis?: unknown;
};

function isN8nWebhookResult(value: unknown): value is N8nWebhookResult {
  return Boolean(value && typeof value === "object" && ("rizivCriteriaMatched" in value || "recommendation" in value || "checkedAt" in value));
}

function buildWebhookResult(entry: N8nWebhookResult, fallbackInput: Parameters<typeof analyzeHearingLoss>[0]): AnalysisResult {
  const matched = Boolean(entry.rizivCriteriaMatched);
  const recommendation = entry.recommendation || entry.extractedCriteriaSummary || (matched ? "RIZIV criteria met." : "RIZIV criteria not met.");
  const thresholdChecked = typeof entry.thresholdChecked === "number" ? entry.thresholdChecked : 0;

  return {
    classification: matched ? "RIZIV criteria matched" : "RIZIV criteria not met",
    summary: recommendation,
    referralRecommended: matched,
    referralReason: recommendation,
    criteria: [
      {
        key: "WEBHOOK_VERDICT",
        title: "Webhook verdict",
        met: matched,
        detail: matched ? "n8n returned rizivCriteriaMatched = true." : "n8n returned rizivCriteriaMatched = false.",
      },
      {
        key: "THRESHOLD_CHECKED",
        title: "Threshold checked",
        met: typeof entry.thresholdChecked === "number",
        detail: `Threshold checked: ${thresholdChecked} dB HL.`,
      },
      {
        key: "LEFT_PTA_USED",
        title: "Left PTA used",
        met: typeof entry.leftPTAUsed === "number",
        detail: `Left PTA used: ${entry.leftPTAUsed ?? 0} dB HL.`,
      },
      {
        key: "RIGHT_PTA_USED",
        title: "Right PTA used",
        met: typeof entry.rightPTAUsed === "number",
        detail: `Right PTA used: ${entry.rightPTAUsed ?? 0} dB HL.`,
      },
    ],
    disclaimer: "Result returned by the n8n webhook.",
    generatedAt: entry.checkedAt || new Date().toISOString(),
    confidence: "webhook",
    measurements: {
      leftEar: [0, 0, 0, 0],
      rightEar: [0, 0, 0, 0],
      ptaLeft: typeof entry.leftPTAUsed === "number" ? entry.leftPTAUsed : 0,
      ptaRight: typeof entry.rightPTAUsed === "number" ? entry.rightPTAUsed : 0,
      ptaOverall: thresholdChecked,
      age: fallbackInput.age,
    },
  };
}

export default function LoadingPage() {
  const router = useRouter();

  function normalizeWebhookResult(payload: unknown, fallbackInput: Parameters<typeof analyzeHearingLoss>[0]): AnalysisResult {
    const candidate = payload && typeof payload === "object" ? (payload as { result?: unknown; analysis?: unknown; payload?: unknown }) : null;

    const possibleResult = candidate?.result ?? candidate?.analysis ?? candidate?.payload ?? payload;

    if (Array.isArray(possibleResult) && possibleResult.length > 0 && isN8nWebhookResult(possibleResult[0])) {
      return buildWebhookResult(possibleResult[0], fallbackInput);
    }

    if (isN8nWebhookResult(possibleResult)) {
      return buildWebhookResult(possibleResult, fallbackInput);
    }

    if (possibleResult && typeof possibleResult === "object") {
      const result = possibleResult as Partial<AnalysisResult>;

      if (
        result.classification &&
        result.summary &&
        typeof result.referralRecommended === "boolean" &&
        result.referralReason &&
        Array.isArray(result.criteria) &&
        result.disclaimer &&
        result.generatedAt &&
        result.confidence &&
        result.measurements
      ) {
        return result as AnalysisResult;
      }
    }

    return analyzeHearingLoss(fallbackInput);
  }

  useEffect(() => {
    const pending = readPendingInput();
    if (!pending) {
      router.replace(`/error?reason=${encodeReason("No scan data found. Please try again.")}`);
      return;
    }

    const run = async () => {
      try {
        const response = await fetch("/api/parse-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: pending.imageDataUrl }),
        });

        const rawText = await response.text();
        console.log("/api/parse-image response", {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: rawText,
        });

        let payload: ParsedWebhookResponse | null = null;
        try {
          payload = rawText ? (JSON.parse(rawText) as ParsedWebhookResponse) : null;
        } catch {
          payload = null;
        }

        const responsePayload: ParsedWebhookResponse | null = payload;
        const payloadValue = responsePayload?.payload;
        const errorValue = responsePayload?.error;

        if (isNoAudiogramMessage(payloadValue) || isNoAudiogramMessage(errorValue) || isNoAudiogramMessage(rawText)) {
          throw new Error("No audiogram provided");
        }

        if (!response.ok) {
          throw new Error(errorValue || rawText || "Analysis failed.");
        }

        const result = normalizeWebhookResult(payloadValue ?? responsePayload, pending);
        saveAnalysisResult(result);
        clearPendingInput();
        router.replace("/result");
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Unexpected analysis error";
        router.replace(`/error?reason=${encodeReason(reason)}`);
      }
    };

    void run();
  }, [router]);

  return (
    <div className="page-enter flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <main className="card w-full max-w-md px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mb-4 flex justify-center">
          <EarPulseLogo size="lg" muted animate />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Loading...</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--muted)] sm:text-[15px]">
          Processing audiogram input and applying rule-based hearing-loss criteria.
        </p>
      </main>
    </div>
  );
}