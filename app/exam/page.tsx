import type { Metadata } from "next";
import { Suspense } from "react";
import Exam from "@/components/exam";

export const metadata: Metadata = { title: "Exam · Second Opinion" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 pt-4">
      <Suspense fallback={<p className="text-dim">Loading exam…</p>}>
        <Exam />
      </Suspense>
    </main>
  );
}
