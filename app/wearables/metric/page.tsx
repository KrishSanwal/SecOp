import type { Metadata } from "next";
import { Suspense } from "react";
import Detail from "@/components/wearables/detail";

export const metadata: Metadata = { title: "Reading · SecOp" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 pt-8 pb-10">
      <Suspense fallback={<p className="text-dim">Loading…</p>}>
        <Detail />
      </Suspense>
    </main>
  );
}
