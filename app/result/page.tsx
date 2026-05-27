"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ResultCriteria } from "@/components/ResultCriteria";
import { clearAnalysisResult, readAnalysisResult } from "@/lib/storage";

export default function ResultPage() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const result = useMemo(() => readAnalysisResult(), []);

  const confidenceLabel =
    result?.confidence === "provided-thresholds"
      ? "High"
      : result?.confidence === "webhook"
        ? "API"
        : "Estimated";

  const confidencePercent =
    result?.confidence === "provided-thresholds"
      ? 95
      : result?.confidence === "webhook"
        ? 100
        : 70;

  const sourceLabel = result?.confidence === "webhook" ? "n8n API" : "rule-based engine";

  if (!result) {
    return (
      <div className="page-enter flex min-h-screen items-center justify-center p-6">
        <main className="card w-full max-w-md p-6 text-center">
          <h1 className="mb-2 text-2xl font-bold">No result available</h1>
          <p className="mb-5 text-sm text-[var(--muted)]">Please run a new scan to see analysis output.</p>
          <Link href="/scan">
            <PrimaryButton fullWidth>Go to scan</PrimaryButton>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <main className="app-shell mx-auto w-full max-w-4xl space-y-4 sm:space-y-5">
        <div className="print-card card p-5 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold sm:text-3xl">{result.classification}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                result.referralRecommended ? "bg-[#fce6eb] text-[var(--brand)]" : "bg-[#e8f5ef] text-[var(--ok)]"
              }`}
            >
              {result.referralRecommended ? "Referral recommended" : "Referral not flagged"}
            </span>
          </div>

          <p className="mb-4 text-sm leading-6 text-[var(--muted)] sm:text-[15px]">{result.summary}</p>

          <div className="rounded-2xl border border-[var(--border)] bg-[#f8f9fc] p-4">
            <p className="text-sm font-semibold">Recommendation</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{result.referralReason}</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">PTA Left</p>
              <p className="text-lg font-bold sm:text-xl">{result.measurements.ptaLeft} dB</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">PTA Right</p>
              <p className="text-lg font-bold sm:text-xl">{result.measurements.ptaRight} dB</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Confidence</p>
              <p className="text-lg font-bold sm:text-xl">{confidencePercent}%</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{confidenceLabel}</p>
            </div>
          </div>

          <button
            type="button"
            className="focus-ring mt-4 text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? "Hide details" : "More info"}
          </button>

          {showDetails ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[#fcfdff] p-4">
              <ResultCriteria items={result.criteria} />
              <div className="rounded-xl bg-[#fff4f6] p-3 text-sm leading-6 text-[#712235]">{result.disclaimer}</div>
              <p className="text-xs text-[var(--muted)]">
                Generated at: {new Date(result.generatedAt).toLocaleString()} | Source: {sourceLabel}
              </p>
            </div>
          ) : null}
        </div>

        <div className="no-print card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton fullWidth onClick={() => window.print()}>
              Download PDF
            </PrimaryButton>
            <PrimaryButton
              fullWidth
              variant="secondary"
              onClick={() => {
                clearAnalysisResult();
                router.push("/scan");
              }}
            >
              New scan
            </PrimaryButton>
          </div>
        </div>
      </main>
    </div>
  );
}