"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ResultCriteria } from "@/components/ResultCriteria";
import { clearAnalysisResult, readAnalysisResult } from "@/lib/storage";
import { translateAnalysisResult } from "@/lib/webhook-translation";

export default function ResultPage() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const storedResult = useMemo(() => readAnalysisResult(), []);
  const result = useMemo(() => (storedResult ? translateAnalysisResult(storedResult) : null), [storedResult]);

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

  const exportPdf = async () => {
    if (!result || isExporting) {
      return;
    }

    setIsExporting(true);

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 16;
      let y = margin;

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const addHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(223, 18, 55);
        doc.text("SONARIS Analysis Report", margin, y);
        y += 28;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(19, 20, 23);
        doc.text(`Generated at: ${generatedAtLabel}`, margin, y);
        y += 16;
        doc.text(`Source: ${sourceLabel}`, margin, y);
        y += 24;
      };

      const addHeading = (text: string) => {
        ensureSpace(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(19, 20, 23);
        doc.text(text, margin, y);
        y += 18;
      };

      const addParagraph = (text: string, fontSize = 11) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fontSize);
        doc.setTextColor(19, 20, 23);
        const lines = doc.splitTextToSize(text, contentWidth);
        ensureSpace(lines.length * lineHeight + 4);
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + 8;
      };

      const addKeyValue = (label: string, value: string) => {
        addParagraph(`${label}: ${value}`);
      };

      addHeader();
      addHeading(result.classification);
      addParagraph(result.summary, 12);

      addHeading("Recommendation");
      addParagraph(result.referralReason);

      addHeading("Measurements");
      addKeyValue("PTA Left", `${result.measurements.ptaLeft} dB`);
      addKeyValue("PTA Right", `${result.measurements.ptaRight} dB`);
      addKeyValue("Overall PTA", `${result.measurements.ptaOverall} dB`);
      if (typeof result.measurements.age === "number") {
        addKeyValue("Age", `${result.measurements.age}`);
      }

      addHeading("Criteria");
      for (const item of result.criteria) {
        ensureSpace(36);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${item.met ? "Met" : "Not met"} - ${item.title}`, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(item.detail, contentWidth);
        ensureSpace(lines.length * lineHeight + 4);
        doc.text(lines, margin, y);
        y += lines.length * lineHeight + 8;
      }

      ensureSpace(30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(89, 97, 116);
      const disclaimerLines = doc.splitTextToSize(result.disclaimer, contentWidth);
      doc.text(disclaimerLines, margin, y);

      doc.save("sonaris-analysis-report.pdf");
    } finally {
      setIsExporting(false);
    }
  };

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

  const generatedAtLabel = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(result.generatedAt));

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
                Generated at: {generatedAtLabel} | Source: {sourceLabel}
              </p>
            </div>
          ) : null}
        </div>

        <div className="no-print card p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <PrimaryButton fullWidth onClick={() => void exportPdf()} disabled={isExporting}>
              {isExporting ? "Generating PDF..." : "Download PDF"}
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