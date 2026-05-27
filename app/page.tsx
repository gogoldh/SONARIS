import Link from "next/link";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function Home() {
  return (
    <div className="page-enter flex min-h-screen flex-col items-center justify-center p-6">
      <main className="w-full max-w-sm text-center">
        <div className="mx-auto mb-8 flex justify-center">
          <EarPulseLogo size="lg" />
        </div>

        <p className="font-body mx-auto mb-6 max-w-xs text-sm leading-relaxed text-[var(--muted)]">
          Krijg een duidelijke, gestandaardiseerde interpretatie en ondersteun je doorverwijzing naar gespecialiseerde zorg.
        </p>

        <Link href="/scan" className="block">
          <PrimaryButton fullWidth>Try it!</PrimaryButton>
        </Link>

        <div className="mt-6 text-xs leading-relaxed text-[var(--muted)]">
          <p className="font-heading mb-1 underline decoration-[var(--brand)] underline-offset-4">Meer info over de app</p>
          <p className="font-body">
            Ondersteun je audiogram-interpretatie met gestandaardiseerde criteria.
          </p>
        </div>
      </main>
    </div>
  );
}
