"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { clearAnalysisResult, savePendingInput } from "@/lib/storage";
import { RoboflowPrediction } from "@/lib/detection-utils";

export default function ScanPage() {
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [age, setAge] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const autoExtractRoboflow = async () => {
    if (!imageDataUrl) {
      setParseError("Please upload an image first.");
      return;
    }

    setParseLoading(true);
    setParseError(null);

    try {
      const img = new window.Image();
      img.src = imageDataUrl;
      await new Promise((res, rej) => {
        img.onload = () => res(true);
        img.onerror = () => rej(new Error("Failed to load image"));
      });

      const width = img.naturalWidth || img.width || 1000;
      const height = img.naturalHeight || img.height || 800;

      const res = await fetch("/api/roboflow/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });

      const payload = await res.json();
      if (!res.ok || !payload?.success) {
        const msg = payload?.error || `Roboflow inference failed (${res.status})`;
        setParseError(msg);
        return;
      }

      const rf = payload.payload as { predictions?: any[] };
      const predsRaw = rf?.predictions || [];

      const preds: RoboflowPrediction[] = predsRaw.map((p: any) => ({
        x: Number(p.x ?? p.center_x ?? 0),
        y: Number(p.y ?? p.center_y ?? 0),
        width: Number(p.width ?? p.w ?? 0),
        height: Number(p.height ?? p.h ?? 0),
        confidence: Number(p.confidence ?? p.score ?? 0),
        class: String(p.class ?? p.label ?? "unknown"),
      }));

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setParseError(`Auto-extract failed: ${message}`);
    } finally {
      setParseLoading(false);
    }
  };

  const submitForAnalysis = () => {
    if (!imageDataUrl) {
      setError("Please upload or capture an audiogram image before continuing.");
      return;
    }

    const fileName = `upload-${Date.now()}.png`;

    clearAnalysisResult();
    savePendingInput({
      fileName,
      imageDataUrl,
      age: age.trim() === "" ? undefined : Number(age),
      // thresholds removed: detection/extraction is handled server-side
    });
    router.push("/loading");
  };

  return (
    <div className="page-enter min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Audiogram Screening</h1>
            <Link href="/" className="text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline">
              Back
            </Link>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)]">Upload an audiogram image and the app will send it to the server for parsing.</p>
        </div>

        {/* Two-column layout: Image + Form */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Image Reference */}
          <div className="card flex flex-col p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-bold">Audiogram Reference</h2>
            <label className="focus-ring flex flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-3 text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                capture="environment"
                className="sr-only"
                onChange={onFile}
              />
              {imageDataUrl ? (
                <Image
                  src={imageDataUrl}
                  alt="Uploaded audiogram"
                  width={800}
                  height={600}
                  unoptimized
                  className="max-h-96 w-auto rounded-xl object-contain"
                />
              ) : (
                <>
                  <p className="text-sm font-semibold">Tap to upload image</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">JPG, PNG, or PDF</p>
                </>
              )}
            </label>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="rounded-md bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={autoExtractRoboflow}
                disabled={parseLoading || !imageDataUrl}
              >
                {parseLoading ? "Extracting..." : "Auto-extract (Roboflow)"}
              </button>

              {parseError ? (
                <p className="text-xs font-semibold text-[var(--warn)]">{parseError}</p>
              ) : null}
            </div>
          </div>

          {/* Manual thresholds removed — image upload triggers server-side parsing */}
        </div>

        {error && <p className="px-2 text-sm font-semibold text-[var(--brand)]">{error}</p>}

        <div className="no-print card p-4">
          <PrimaryButton fullWidth onClick={submitForAnalysis}>
            Analyze
          </PrimaryButton>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">Upload an audiogram image to begin screening.</p>
        </div>
      </div>
    </div>
  );
}