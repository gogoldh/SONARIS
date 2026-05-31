"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { clearPendingInput, readPendingInput, saveAnalysisResult } from "@/lib/storage";
import { translateAnalysisResult, translateWebhookText } from "@/lib/webhook-translation";
import type { AnalysisResult } from "@/types/analysis";

function encodeReason(message: string): string {
  return encodeURIComponent(message);
}

function isNoAudiogramMessage(value: unknown): boolean {
  return typeof value === "string" && /no audiogram provided/i.test(value);
}

type LoadingTip = {
  label: string;
  text: string;
};

const LOADING_TIPS: LoadingTip[] = [
  {
    label: "Did you know?",
    text: "Belgium's RIZIV reimbursement threshold for a cochlear implant is stricter than in many countries. An average hearing loss of at least 70 dB is required.",
  },
  {
    label: "Did you know?",
    text: "The Pure Tone Average (PTA) you compute is based on the Fletcher index, which focuses on the speech frequencies: 500 Hz, 1000 Hz, and 2000 Hz.",
  },
  {
    label: "Did you know?",
    text: "Hearing loss is not only about volume. High frequencies are often lost first, which makes consonants like s, f, and t harder to hear.",
  },
  {
    label: "Did you know?",
    text: "The human cochlea is shaped like a snail shell and is about the size of a pea, yet it contains roughly 15,000 vulnerable hair cells.",
  },
  {
    label: "Did you know?",
    text: "The World Health Organization estimates that by 2050 nearly 2.5 billion people worldwide will live with some form of hearing loss.",
  },
  {
    label: "Tip",
    text: "Sonaris uses a human-in-the-loop workflow: AI digitizes the graph quickly, but you keep final clinical control before RIZIV assessment.",
  },
  {
    label: "Tip",
    text: "You can upload both red/blue audiograms and black-and-white copies. The vision engine scans for geometric symbols only.",
  },
  {
    label: "Tip",
    text: "For the best scan results, make sure the graph is straight in the frame and no heavy shadows fall over the grid lines.",
  },
  {
    label: "Tip",
    text: "Sonaris has a local backup engine. If the cloud connection drops, the calculation is automatically handled offline.",
  },
  {
    label: "Did you know?",
    text: "Your ears never sleep. Even while you rest, your brain filters sound and decides what matters enough to wake you.",
  },
  {
    label: "Did you know?",
    text: "The stapes in the middle ear is the smallest bone in the human body, at only about 3 millimeters long.",
  },
  {
    label: "Did you know?",
    text: "The vestibular system sits next to the hearing organ in the inner ear, which is why inner-ear damage can also cause dizziness.",
  },
  {
    label: "Did you know?",
    text: "Sound travels almost four times faster through water than through air.",
  },
  {
    label: "Did you know?",
    text: "Long-term exposure to sounds above 85 decibels, such as a loud lawnmower or city traffic, can cause permanent hearing damage.",
  },
];

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

function buildWebhookResult(entry: N8nWebhookResult, age?: number): AnalysisResult {
  const matched = Boolean(entry.rizivCriteriaMatched);
  const recommendation = translateWebhookText(
    entry.recommendation || entry.extractedCriteriaSummary || (matched ? "RIZIV criteria met." : "RIZIV criteria not met."),
  );
  const ptaLeftUsed = typeof entry.leftPTAUsed === "number" ? entry.leftPTAUsed : undefined;
  const ptaRightUsed = typeof entry.rightPTAUsed === "number" ? entry.rightPTAUsed : undefined;
  const thresholdChecked =
    typeof entry.thresholdChecked === "number"
      ? entry.thresholdChecked
      : typeof ptaLeftUsed === "number" && typeof ptaRightUsed === "number"
        ? Math.round((((ptaLeftUsed + ptaRightUsed) / 2) * 10)) / 10
        : typeof ptaLeftUsed === "number"
          ? ptaLeftUsed
          : typeof ptaRightUsed === "number"
            ? ptaRightUsed
            : 0;
  const resolvedLeftPta = ptaLeftUsed ?? thresholdChecked;
  const resolvedRightPta = ptaRightUsed ?? thresholdChecked;

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
        met: typeof entry.thresholdChecked === "number" || thresholdChecked > 0,
        detail: `Threshold checked: ${thresholdChecked} dB HL.`,
      },
      {
        key: "LEFT_PTA_USED",
        title: "Left PTA used",
        met: typeof ptaLeftUsed === "number" || thresholdChecked > 0,
        detail: `Left PTA used: ${resolvedLeftPta} dB HL.`,
      },
      {
        key: "RIGHT_PTA_USED",
        title: "Right PTA used",
        met: typeof ptaRightUsed === "number" || thresholdChecked > 0,
        detail: `Right PTA used: ${resolvedRightPta} dB HL.`,
      },
    ],
    disclaimer: "Result returned by the n8n webhook.",
    generatedAt: entry.checkedAt || new Date().toISOString(),
    confidence: "webhook",
    measurements: {
      leftEar: [0, 0, 0, 0],
      rightEar: [0, 0, 0, 0],
      ptaLeft: resolvedLeftPta,
      ptaRight: resolvedRightPta,
      ptaOverall: thresholdChecked,
      age,
    },
  };
}

export default function LoadingPage() {
  const router = useRouter();
  const [tipIndex, setTipIndex] = useState(0);

  function normalizeWebhookResult(payload: unknown, age?: number): AnalysisResult | null {
    const candidate = payload && typeof payload === "object" ? (payload as { result?: unknown; analysis?: unknown; payload?: unknown }) : null;

    const possibleResult = candidate?.result ?? candidate?.analysis ?? candidate?.payload ?? payload;

    if (Array.isArray(possibleResult) && possibleResult.length > 0 && isN8nWebhookResult(possibleResult[0])) {
      return buildWebhookResult(possibleResult[0], age);
    }

    if (isN8nWebhookResult(possibleResult)) {
      return buildWebhookResult(possibleResult, age);
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
        return translateAnalysisResult(result as AnalysisResult);
      }
    }

    return null;
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

        const result = normalizeWebhookResult(payloadValue ?? responsePayload, pending.age);

        if (!result) {
          throw new Error("N8N completed without returning an analysis result.");
        }

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % LOADING_TIPS.length);
    }, 4500);

    return () => window.clearInterval(interval);
  }, []);

  const currentTip = LOADING_TIPS[tipIndex];

  return (
    <div className="page-enter flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <main className="card w-full max-w-md px-6 py-8 text-center sm:px-8 sm:py-10">
        <div className="mb-4 flex flex-col items-center">
          <EarPulseLogo size="lg" />
          <div className="mt-4" aria-hidden>
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent border-gray-300" />
          </div>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Loading...</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--muted)] sm:text-[15px]">
          Processing audiogram input and applying rule-based hearing-loss criteria.
        </p>

        <section className="mt-8 p-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{currentTip.label}</p>
          </div>

          <p className="mx-auto max-w-sm text-sm leading-6 text-[var(--foreground)] sm:text-[15px]">{currentTip.text}</p>

          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
              onClick={() => setTipIndex((current) => (current - 1 + LOADING_TIPS.length) % LOADING_TIPS.length)}
            >
              Previous
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline"
              onClick={() => setTipIndex((current) => (current + 1) % LOADING_TIPS.length)}
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}