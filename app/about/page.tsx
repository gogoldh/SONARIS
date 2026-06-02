import Link from "next/link";
import Image from "next/image";
import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function AboutPage() {
  return (
    <div className="page-enter relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <Link href="/" className="absolute left-4 top-4 text-[var(--muted)] p-2 rounded hover:bg-[rgba(0,0,0,0.03)]">
        <span className="sr-only">Back to home</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </Link>
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
              
            </div>
              <div className="mt-6 flex items-center justify-center">
                <Image src="/media/Thomas%20More-studentenlogo_ENG_oranje_WEB.png" alt="Thomas More logo" width={200} height={90} />
              </div>
          </div>
        </div>
      </main>
    </div>
  );
}
