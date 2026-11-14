"use client";

// Throwaway spike: can a phone camera time the pupil light reflex? Not linked from the app.
import { useEffect, useRef, useState } from "react";
import { landmarker, measure, reflex, type Eye, type Frame, type Reflex } from "@/lib/pupil";

type Phase = "off" | "live" | "dark" | "flash" | "done";

export default function PupilLab() {
  const vid = useRef<HTMLVideoElement>(null);
  const work = useRef<HTMLCanvasElement>(null);
  const dbg = useRef<HTMLCanvasElement>(null);
  const [ph, setPh] = useState<Phase>("off");
  const [eye, setEye] = useState<Eye>("r");
  const [live, setLive] = useState<Frame | null>(null);
  const [out, setOut] = useState<{ r: Reflex; fs: Frame[]; flash: number } | null>(null);
  const [err, setErr] = useState("");
  const rec = useRef<Frame[] | null>(null);
  const eyeRef = useRef<Eye>("r");
  useEffect(() => {
    eyeRef.current = eye;
  }, [eye]);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      vid.current!.srcObject = s;
      await vid.current!.play();
      const f = await landmarker();
      setPh("live");
      const loop = () => {
        const v = vid.current;
        if (!v || v.readyState < 2) return requestAnimationFrame(loop);
        const fr = measure(f, v, performance.now(), eyeRef.current, work.current!, dbg.current!);
        rec.current?.push(fr);
        setLive(fr);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "camera failed");
    }
  }

  async function run() {
    setOut(null);
    rec.current = [];
    setPh("dark");
    await new Promise((r) => setTimeout(r, 1500));
    const flash = performance.now();
    setPh("flash");
    await new Promise((r) => setTimeout(r, 2500));
    const fs = rec.current;
    rec.current = null;
    setOut({ r: reflex(fs, flash), fs, flash });
    setPh("done");
  }

  useEffect(() => () => {
    (vid.current?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
  }, []);

  const cover = ph === "dark" ? "bg-black" : ph === "flash" ? "bg-white" : "";

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Pupil lab (spike)</h1>
      <p className="text-sm text-dim">Hold the phone 10 to 15 cm from your face, front camera at eye level, room lights normal. Keep the eye wide open and look at the camera.</p>
      {err && <p className="text-alert">{err}</p>}
      <div className="flex gap-3">
        <video ref={vid} playsInline muted className="h-40 w-40 rounded-lg bg-black object-cover" />
        <div className="flex flex-col gap-1">
          <canvas ref={dbg} className="h-40 w-40 rounded-lg bg-black [image-rendering:pixelated]" />
          <canvas ref={work} className="hidden" />
        </div>
      </div>
      <p className="font-mono text-sm">
        iris {live ? Math.round(live.irisPx) : "–"} px · pupil/iris {live && Number.isFinite(live.ratio) ? live.ratio.toFixed(3) : "not found"}
      </p>
      <p className="text-xs text-dim">Red = pixels counted as pupil. Want a clean red disc in the middle. Iris should be 25+ px; move closer if not.</p>
      <div className="flex gap-2">
        {(["r", "l"] as Eye[]).map((e) => (
          <button key={e} onClick={() => setEye(e)} aria-pressed={eye === e} className="min-h-11 flex-1 rounded-lg border border-edge aria-pressed:border-accent aria-pressed:text-accent">
            {e === "r" ? "Right eye" : "Left eye"}
          </button>
        ))}
      </div>
      {ph === "off" ? (
        <button onClick={start} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin">Start camera</button>
      ) : (
        <button onClick={run} disabled={ph === "dark" || ph === "flash"} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin disabled:opacity-50">Run light test (4 s)</button>
      )}
      {out && <Result {...out} />}
      {cover && <div className={`fixed inset-0 z-50 ${cover}`} />}
    </main>
  );
}

function Result({ r, fs, flash }: { r: Reflex; fs: Frame[]; flash: number }) {
  const pts = fs.filter((f) => Number.isFinite(f.ratio));
  const t0 = flash - 1500;
  const ys = pts.map((p) => p.ratio);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${((p.t - t0) / 4000) * 300},${100 - ((p.ratio - lo) / (hi - lo || 1)) * 90}`).join(" ");
  const fx = (1500 / 4000) * 300;
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-edge p-3">
      <p className={r.ok ? "text-accent" : "text-alert"}>{r.ok ? "Enough clean frames" : `Not enough clean frames (${pts.length} of ${fs.length})`}</p>
      <p className="font-mono text-sm">
        before {r.base.toFixed(3)} · smallest {r.min.toFixed(3)} · shrank {(r.con * 100).toFixed(0)}% · latency {Number.isFinite(r.lat) ? Math.round(r.lat) + " ms" : "–"}
      </p>
      <svg viewBox="0 0 300 100" className="h-28 w-full bg-panel">
        <line x1={fx} x2={fx} y1="0" y2="100" stroke="white" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="currentColor" className="text-accent" strokeWidth="1.5" />
      </svg>
      <p className="text-xs text-dim">Dashed line = light on. A real reflex: flat, then a drop starting 200 to 400 ms after the line, then a plateau. Normal shrink is roughly 20 to 40%.</p>
    </div>
  );
}
