import Link from "next/link";

import { EarPulseLogo } from "@/components/EarPulseLogo";
import { PrimaryButton } from "@/components/PrimaryButton";

type ErrorPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const reason = params.reason || "The scan could not be processed.";

  return (
    <div className="page-enter flex min-h-screen items-center justify-center p-6">
      <main className="card w-full max-w-md px-8 py-10 text-center">
        <div className="mb-3 flex justify-center">
          <EarPulseLogo size="md" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">That did not sound right.</h1>
        <p className="mb-6 text-sm leading-6 text-[var(--muted)]">{reason}</p>
        <Link href="/scan">
          <PrimaryButton fullWidth>Try again</PrimaryButton>
        </Link>
      </main>
    </div>
  );
}