import Link from "next/link";
import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function AboutPage() {
  return (
    <div className="page-enter flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <main className="app-shell w-full max-w-xl text-center">
        <div className="card px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto mb-8 flex justify-center">
            <EarPulseLogo size="lg" />
          </div>

          <h1 className="font-display text-2xl sm:text-3xl">About SONARIS</h1>

          <p className="font-body mx-auto mb-6 mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            SONARIS provides professional audiogram review and streamlined specialist referral support. It applies standardized screening criteria to audiogram measurements or parsed image data and produces a clear recommendation to help clinicians and care teams triage patients.
          </p>

          <div className="mt-6 space-y-3 text-sm text-[var(--muted)]">
            <p>
              Results are decision-support only and do not replace full clinical assessment. Use SONARIS to support triage and referral planning.
            </p>
            <p>
              For automated audiogram parsing, SONARIS can forward uploads to an external parsing webhook (n8n) and ingest the returned analysis.
            </p>
          </div>

          <div className="mt-6">
            <Link href="/scan" className="mx-auto block w-full max-w-xs sm:max-w-sm">
              <PrimaryButton fullWidth>Start screening</PrimaryButton>
            </Link>
          </div>

          <div className="mt-6 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
            <div className="flex flex-col items-center space-y-2">
              <a
                href="https://sonaris.lukasdhaese.be/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--brand)] underline block"
              >
                Visit marketing site
              </a>
              <Link href="/" className="text-[var(--muted)] underline block">Back to home</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
