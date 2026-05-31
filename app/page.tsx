import Link from "next/link";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  return (
    <div className="page-enter flex min-h-[100svh] w-full items-center justify-center px-4 py-4 sm:px-6">
      <main className="w-full max-w-xl">
        <div className="card mx-auto w-full px-6 py-8 text-center sm:px-10 sm:py-10">
          <div className="mx-auto mb-8 flex justify-center">
            <EarPulseLogo size="lg" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl">SONARIS</h1>

          <p className="font-body mx-auto mb-6 mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Professional audiogram review and streamlined specialist referral support.
          </p>

          <Link href="/scan" className="mx-auto block w-full max-w-xs sm:max-w-sm">
            <PrimaryButton fullWidth>Try it!</PrimaryButton>
          </Link>

          <div className="mt-6 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
            <Link href="/about" className="font-heading mb-1 underline decoration-[var(--brand)] underline-offset-4">About this app</Link>
            <p className="font-body">Support your audiogram interpretation with standardized screening criteria.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
