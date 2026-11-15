import type { Metadata } from "next";
import { Suspense } from "react";
import Board from "@/components/wearables/board";

export const metadata: Metadata = { title: "Wearables · Second Opinion" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 pt-8 pb-10">
      <Suspense fallback={<p className="text-dim">Loading…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
