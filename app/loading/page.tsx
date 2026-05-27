"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { clearPendingInput, readPendingInput, saveAnalysisResult } from "@/lib/storage";
import type { AnalysisResult } from "@/types/analysis";

function encodeReason(message: string): string {
  return encodeURIComponent(message);
}

export default function LoadingPage() {
  const router = useRouter();

  useEffect(() => {
    const pending = readPendingInput();
    if (!pending) {
      router.replace(`/error?reason=${encodeReason("No scan data found. Please try again.")}`);
      return;
    }

    const run = async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pending),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Analysis failed.");
        }

        const result = (await response.json()) as AnalysisResult;
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