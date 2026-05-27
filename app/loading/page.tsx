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

export default function LoadingPage() {
  const router = useRouter();

  function normalizeWebhookResult(payload: unknown, fallbackInput: Parameters<typeof analyzeHearingLoss>[0]): AnalysisResult {
    const candidate =
      payload && typeof payload === "object"
        ? (payload as { result?: unknown; analysis?: unknown; payload?: unknown })
        : null;

    const possibleResult = candidate?.result ?? candidate?.analysis ?? payload;

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

        let payload: { error?: string; success?: boolean; payload?: unknown } | null = null;
        try {
          payload = rawText ? (JSON.parse(rawText) as typeof payload) : null;
        } catch {
          payload = null;
        }

        if (!response.ok) {
          throw new Error(payload?.error || rawText || "Analysis failed.");
        }

        const result = normalizeWebhookResult(payload?.payload, pending);
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
    <div className="page-enter flex min-h-screen items-center justify-center p-6">
      <main className="card w-full max-w-md px-8 py-10 text-center">
        <div className="mb-4 flex justify-center">
          <EarPulseLogo size="lg" muted animate />
        </div>
        <h1 className="text-3xl font-bold">Loading...</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--muted)]">
          Processing audiogram input and applying rule-based hearing-loss criteria.
        </p>
      </main>
    </div>
  );
}