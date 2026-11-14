"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { wipe } from "@/lib/db";
import { seed } from "@/lib/seed";

export default function Demo() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!confirm("Load a demo crew? This replaces the crew and exams on this device.")) return;
    setBusy(true);
    try {
      await wipe();
      router.push(`/result?id=${await seed()}`);
    } catch {
      setBusy(false);
      alert("Could not load the demo crew. Reload the page and try again.");
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="ml-auto min-h-11 rounded-lg border border-edge px-3 text-sm font-medium text-dim transition-colors hover:border-dim hover:text-foreground disabled:opacity-50">
      {busy ? "Loading…" : "Try demo"}
    </button>
  );
}
