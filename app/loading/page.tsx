"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import {
  buildAnalysisResultFromRecord,
  extractAnalysisRecordId,
  isAnalysisRecordReady,
  type AnalysisRecord,
} from "@/lib/analysis-record";
import { clearPendingInput, readPendingInput, saveAnalysisResult } from "@/lib/storage";

function encodeReason(message: string): string {
  return encodeURIComponent(message);
}

function isNoAudiogramMessage(value: unknown): boolean {
  return typeof value === "string" && /no audiogram provided/i.test(value);
}

function containsNoAudiogram(value: unknown, depth = 0): boolean {
  if (depth > 6) return false;
  if (isNoAudiogramMessage(value)) return true;
  if (Array.isArray(value)) {
    for (const item of value) {
      if (containsNoAudiogram(item, depth + 1)) return true;
    }
    return false;
  }
  if (value && typeof value === "object") {
    for (const k of Object.keys(value as Record<string, unknown>)) {
      try {
        if (containsNoAudiogram((value as Record<string, unknown>)[k], depth + 1)) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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

type ParseImageResponse = {
  success?: boolean;
  error?: string;
  id?: number | string | null;
  recordId?: number | string | null;
  payload?: unknown;
};

type AnalysisStatusResponse = {
  success?: boolean;
  error?: string;
  ready?: boolean;
  data?: AnalysisRecord | null;
};

function parseErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function LoadingPage() {
  const router = useRouter();
  const [tipIndex, setTipIndex] = useState(0);
  const [statusText, setStatusText] = useState("Sending image to n8n...");

  useEffect(() => {
    let active = true;

    const pending = readPendingInput();
    if (!pending) {
      router.replace(`/error?reason=${encodeReason("No scan data found. Please try again.")}`);
      return;
    }

    const finalize = (record: AnalysisRecord) => {
      const result = buildAnalysisResultFromRecord(record, pending.age);
      saveAnalysisResult(result);
      clearPendingInput();
      router.replace("/result");
    };

    const run = async () => {
      try {
        setStatusText("Sending image to n8n...");

        const response = await fetch("/api/parse-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: pending.imageDataUrl }),
        });

        const payload = (await response.json()) as ParseImageResponse;

        // If the webhook indicated no audiogram (possibly nested), stop immediately
        if (containsNoAudiogram(payload) || containsNoAudiogram(payload.payload) || containsNoAudiogram(payload.error)) {
          throw new Error("No audiogram provided");
        }

        if (!response.ok) {
          throw new Error(payload.error || "Analysis failed.");
        }

        const rawId = payload.id ?? payload.recordId ?? payload.payload;
        let recordId: number | null = null;

        if (typeof rawId === "number") {
          recordId = Number.isFinite(rawId) ? Math.trunc(rawId) : null;
        } else if (typeof rawId === "string") {
          const numeric = Number(rawId);
          recordId = Number.isFinite(numeric) && numeric > 0 ? Math.trunc(numeric) : null;
        } else {
          recordId = extractAnalysisRecordId(rawId);
        }

        if (!recordId) {
          throw new Error("N8N returned no record id to poll for.");
        }

        setStatusText(`Waiting for analysis record ${recordId} to be updated...`);

        const maxAttempts = 90;

        for (let attempt = 0; attempt < maxAttempts && active; attempt += 1) {
          const statusResponse = await fetch(`/api/analysis-status?id=${recordId}`, { cache: "no-store" });
          const statusPayload = (await statusResponse.json()) as AnalysisStatusResponse;

          if (!statusResponse.ok) {
            throw new Error(statusPayload.error || `Polling failed (${statusResponse.status}).`);
          }

          // If backend decided the record is ready but contains an error (e.g. low confidence or invalid audiogram), show it
          if (statusPayload.ready && (statusPayload as any).error) {
            const msg = (statusPayload as any).error as string;
            router.replace(`/error?reason=${encodeReason(msg)}`);
            return;
          }

          if (statusPayload.ready && statusPayload.data && isAnalysisRecordReady(statusPayload.data)) {
            finalize(statusPayload.data);
            return;
          }

          setStatusText(`Still processing record ${recordId}...`);

          if (attempt < maxAttempts - 1) {
            await sleep(2000);
          }
        }

        throw new Error("The analysis is taking longer than expected. Please try again.");
      } catch (error) {
        if (!active) {
          return;
        }

        const reason = parseErrorMessage(error, "Unexpected analysis error");
        router.replace(`/error?reason=${encodeReason(reason)}`);
      }
    };

    void run();

    return () => {
      active = false;
    };
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
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-[var(--muted)] sm:text-[15px]">{statusText}</p>

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