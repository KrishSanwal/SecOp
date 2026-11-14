"use client";

import { useRef, useState } from "react";
import { measureHr, openRear, type PpgResult } from "@/lib/ppg";

export default function HrLab() {
  const vid = useRef<HTMLVideoElement>(null);
  const [st, setSt] = useState<"off" | "on" | "run">("off");
  const [torch, setTorch] = useState<boolean | null>(null);
  const [live, setLive] = useState<{ t: number; on: boolean; bpm: number } | null>(null);
  const [out, setOut] = useState<PpgResult | null>(null);
  const [err, setErr] = useState("");

  async function cam() {
    try {
      const { s, torch } = await openRear();
      vid.current!.srcObject = s;
      await vid.current!.play();
      setTorch(torch);
      setSt("on");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "camera failed");
    }
  }

  async function run() {
    setOut(null);
    setSt("run");
    const r = measureHr(vid.current!, 20, setLive);
    setOut(await r.done);
    setSt("on");
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Heart rate lab</h1>
      <p className="text-sm text-dim">Cover the back camera and flash completely with your fingertip. Press lightly, keep still. Compare with a manual pulse count or a watch.</p>
      {err && <p className="text-alert">{err}</p>}
      <video ref={vid} playsInline muted className="h-32 w-32 rounded-lg bg-black object-cover" />
      {torch === false && <p className="text-alert text-sm">Flashlight not available in this browser. Works in bright light only; best on Android Chrome.</p>}
      {st === "off" ? (
        <button onClick={cam} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin">Start camera</button>
      ) : (
        <button onClick={run} disabled={st === "run"} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin disabled:opacity-50">{st === "run" ? "Measuring 20 s…" : "Measure 20 s"}</button>
      )}
      {live && st === "run" && (
        <p className="font-mono">{Math.round(live.t / 1000)} s · finger {live.on ? "on ✓" : "OFF"} · {Number.isFinite(live.bpm) ? Math.round(live.bpm) + " bpm" : "…"}</p>
      )}
      {out && (
        <p className="font-mono text-lg">
          {Number.isFinite(out.bpm) ? `${Math.round(out.bpm)} bpm` : "no clean signal"} · finger on {Math.round(out.q * 100)}% · {out.beats} beats
        </p>
      )}
    </main>
  );
}
