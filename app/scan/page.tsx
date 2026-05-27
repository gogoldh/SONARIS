"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChangeEvent, useMemo, useState } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";
import { clearAnalysisResult, savePendingInput } from "@/lib/storage";

const FREQ_LABELS = ["500 Hz", "1000 Hz", "2000 Hz", "4000 Hz"];

function toNumbers(values: string[]): number[] | undefined {
  if (values.every((value) => value.trim() === "")) {
    return undefined;
  }

  return values.map((value) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  });
}

export default function ScanPage() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [age, setAge] = useState("");
  const [left, setLeft] = useState(["", "", "", ""]);
  const [right, setRight] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);

  const hasManualInput = useMemo(
    () => [...left, ...right].some((value) => value.trim() !== ""),
    [left, right],
  );

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateEarValue = (ear: "left" | "right", index: number, value: string) => {
    const onlyNumber = value.replace(/[^0-9]/g, "");
    if (ear === "left") {
      setLeft((current) => current.map((item, i) => (i === index ? onlyNumber : item)));
      return;
    }
    setRight((current) => current.map((item, i) => (i === index ? onlyNumber : item)));
  };

  const submitForAnalysis = () => {
    if (!fileName) {
      setError("Please upload or capture an audiogram image before continuing.");
      return;
    }

    clearAnalysisResult();
    savePendingInput({
      fileName,
      imageDataUrl,
      age: age.trim() === "" ? undefined : Number(age),
      thresholdsLeft: toNumbers(left),
      thresholdsRight: toNumbers(right),
    });
    router.push("/loading");
  };

  return (
    <div className="page-enter min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Upload Audiogram</h1>
            <Link href="/" className="text-sm font-semibold text-[var(--brand)] underline-offset-4 hover:underline">
              Back
            </Link>
          </div>

          <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
            Add an audiogram scan. Optional threshold values improve reliability of this rule-based screening.
          </p>

          <label className="focus-ring flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={onFile}
            />

            {imageDataUrl ? (
              <Image
                src={imageDataUrl}
                alt="Uploaded audiogram"
                width={800}
                height={500}
                unoptimized
                className="max-h-52 w-auto rounded-xl object-contain"
              />
            ) : (
              <>
                <p className="text-base font-semibold">Tap to upload or scan</p>
                <p className="mt-1 text-sm text-[var(--muted)]">JPG, PNG, HEIC (camera capture supported)</p>
              </>
            )}
          </label>

          <p className="mt-3 text-xs text-[var(--muted)]">{fileName || "No file selected"}</p>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="mb-2 text-xl font-bold">Optional Clinical Inputs</h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Summary-first UX: if threshold fields are empty, Sonaris uses conservative estimated thresholds.
          </p>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold">Age</span>
            <input
              className="focus-ring w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
              type="number"
              min={0}
              max={120}
              value={age}
              onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ""))}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Left Ear (dB HL)</h3>
              <div className="space-y-2">
                {FREQ_LABELS.map((label, index) => (
                  <label key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--muted)]">{label}</span>
                    <input
                      className="focus-ring w-24 rounded-lg border border-[var(--border)] px-2 py-1 text-right"
                      inputMode="numeric"
                      value={left[index]}
                      onChange={(event) => updateEarValue("left", index, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Right Ear (dB HL)</h3>
              <div className="space-y-2">
                {FREQ_LABELS.map((label, index) => (
                  <label key={label} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--muted)]">{label}</span>
                    <input
                      className="focus-ring w-24 rounded-lg border border-[var(--border)] px-2 py-1 text-right"
                      inputMode="numeric"
                      value={right[index]}
                      onChange={(event) => updateEarValue("right", index, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error ? <p className="px-2 text-sm font-semibold text-[var(--brand)]">{error}</p> : null}

        <div className="no-print card p-4">
          <PrimaryButton fullWidth onClick={submitForAnalysis}>
            Analyze Scan
          </PrimaryButton>
          <p className="mt-2 text-center text-xs text-[var(--muted)]">
            {hasManualInput
              ? "Using provided thresholds for higher confidence analysis."
              : "No thresholds entered: Sonaris will run estimated screening logic."}
          </p>
        </div>
      </div>
    </div>
  );
}