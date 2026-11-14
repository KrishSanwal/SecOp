"use client";

import { useState } from "react";
import { askMotion, measureSway, type SwayResult } from "@/lib/sway";

export default function SwayLab() {
  const [run, setRun] = useState(false);
  const [live, setLive] = useState<number | null>(null);
  const [out, setOut] = useState<SwayResult | null>(null);
  const [err, setErr] = useState("");

  async function go() {
    setErr("");
    setOut(null);
    if (!(await askMotion())) return setErr("Motion sensor not available or permission denied.");
    setRun(true);
    const r = measureSway(30, (p) => setLive(p.rms));
    setOut(await r.done);
    setRun(false);
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Balance lab</h1>
      <p className="text-sm text-dim">Hold the phone flat against your chest with both hands. Feet together, eyes closed, 30 s. Try once normally, once on one leg, to see the numbers move.</p>
      {err && <p className="text-alert">{err}</p>}
      <button onClick={go} disabled={run} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin disabled:opacity-50">{run ? "Hold still…" : "Start 30 s"}</button>
      {run && live != null && <p className="font-mono">sway {live.toFixed(3)} m/s²</p>}
      {out && (
        <p className="font-mono text-lg">
          {out.dead ? "sensor sent no data" : `sway ${out.rms.toFixed(3)} m/s² · peak ${out.peak.toFixed(2)} · ${out.out ? `stepped out at ${out.secs} s` : "held 30 s"} · ${out.n} samples`}
        </p>
      )}
    </main>
  );
}
