import Link from "next/link";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  return (
    <div className="page-enter flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6">
      <main className="app-shell w-full max-w-xl text-center">
        <div className="card px-6 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto mb-8 flex justify-center">
          <EarPulseLogo size="lg" />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl">SONARIS</h1>

          <p className="font-body mx-auto mb-6 mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            Krijg een duidelijke, gestandaardiseerde interpretatie en ondersteun je doorverwijzing naar gespecialiseerde zorg.
          </p>

          <Link href="/scan" className="mx-auto block w-full max-w-xs sm:max-w-sm">
            <PrimaryButton fullWidth>Try it!</PrimaryButton>
          </Link>

          <div className="mt-6 text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
            <p className="font-heading mb-1 underline decoration-[var(--brand)] underline-offset-4">Meer info over de app</p>
            <p className="font-body">Ondersteun je audiogram-interpretatie met gestandaardiseerde criteria.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
