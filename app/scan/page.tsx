"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { clearAnalysisResult, savePendingInput } from "@/lib/storage";

export default function ScanPage() {
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [age, setAge] = useState("");
  
  const [error, setError] = useState<string | null>(null);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
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
    <div className="page-enter min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="app-shell w-full space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold sm:text-2xl">Audiogram Screening</h1>
            <Link href="/" className="text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline">
              Back
            </Link>
          </div>
          <p className="text-sm leading-6 text-[var(--muted)] sm:text-[15px]">Upload an audiogram image and the app will send it to the server for parsing.</p>
        </div>

        {/* Two-column layout: Image + Form */}
        <div className="scan-layout">
          {/* Image Reference */}
          <div className="scan-panel card flex flex-col p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-bold sm:text-base">Audiogram Reference</h2>
            <label className="focus-ring flex min-h-[16rem] flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-3 text-center sm:min-h-[22rem]">
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
                  className="max-h-[21rem] w-auto rounded-xl object-contain sm:max-h-[27rem]"
                />
              ) : (
                <>
                  <p className="text-sm font-semibold sm:text-base">Tap to upload image</p>
                  <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">JPG, PNG, or PDF</p>
                </>
              )}
            </label>

            <p className="mt-3 text-xs text-[var(--muted)] sm:text-sm">
              The uploaded image will be analyzed after you click Analyze.
            </p>
          </div>

          <aside className="scan-details scan-panel card p-5 sm:p-6">
            <h2 className="mb-3 text-sm font-bold sm:text-base">Scan details</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Age</span>
                <input
                  className="soft-input text-sm sm:text-[15px]"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="120"
                  placeholder="Optional age"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                />
              </label>

              <div className="rounded-2xl border border-[var(--border)] bg-[#fbfcfe] p-4">
                <p className="text-sm font-semibold">How it works</p>
                <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--muted)]">
                  <li>1. Upload a clear audiogram image.</li>
                  <li>2. Click Analyze to send it to n8n.</li>
                  <li>3. Review the result on the next screen.</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-[var(--surface-soft)] p-4 text-sm leading-6 text-[var(--muted)]">
                Best results come from a straight-on photo or scan with readable axis labels and thresholds.
              </div>
            </div>
          </aside>
        </div>

        {error && <p className="px-2 text-sm font-semibold text-[var(--brand)] sm:text-base">{error}</p>}

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