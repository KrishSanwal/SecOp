import type { Metadata } from "next";
import { Suspense } from "react";
import Result from "@/components/result";

export const metadata: Metadata = { title: "Result · Second Opinion" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 pt-8">
      <Suspense fallback={<p className="text-dim">Loading result…</p>}>
        <Result />
      </Suspense>
    </main>
  );
}
