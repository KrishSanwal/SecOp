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
      const id = await seed();
      router.push(`/result?id=${id}`);
    } catch (err) {
      setBusy(false);
      console.error("Demo load failed:", err);
      alert("Could not load the demo crew. Reload the page and try again.");
    }
  }

  return (
    <button type="button" onClick={go} disabled={busy} className="min-h-11 rounded-[3px] border border-accent px-3 text-sm font-semibold whitespace-nowrap text-accent transition-colors hover:bg-accent/10 disabled:opacity-50">
      {busy ? "Loading…" : "Try demo"}
    </button>
  );
}
