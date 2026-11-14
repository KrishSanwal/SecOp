"use client";

import { useEffect, useRef, useState } from "react";
import { beep, Page, Prep, Status, Verdict, wait, type Tone } from "@/components/lab";
import { landmarker, measure, ready, reflex, type Check, type Eye, type Frame, type Reflex } from "@/lib/pupil";

type Ph = "prep" | "align" | "dark" | "flash" | "done";

const PREP = [
  "Screen brightness to maximum",
  "Room lights on, no bright window behind you",
  "Glasses off",
  "Hold the phone at eye level, 10 to 15 cm from your face",
  "Look straight into the front camera, not at the screen",
];

export default function PupilLab() {
  const vid = useRef<HTMLVideoElement>(null);
  const work = useRef<HTMLCanvasElement>(null);
  const dbg = useRef<HTMLCanvasElement>(null);
  const [ph, setPh] = useState<Ph>("prep");
  const [eye, setEye] = useState<Eye>("r");
  const [checks, setChecks] = useState<Check[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [out, setOut] = useState<Reflex | null>(null);
  const [debug, setDebug] = useState(false);
  const [err, setErr] = useState("");

  const st = useRef({ ph: "prep" as Ph, eye: "r" as Eye, fs: [] as Frame[], rec: null as Frame[] | null, okRun: 0, busy: false, debug: false, raf: 0, s: null as MediaStream | null });
  useEffect(() => {
    st.current.ph = ph;
    st.current.eye = eye;
    st.current.debug = debug;
  }, [ph, eye, debug]);

  useEffect(() => {
    const S = st.current;
    return () => {
      cancelAnimationFrame(S.raf);
      S.s?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function open() {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      st.current.s = s;
      setPh("align");
      await wait(0);
      vid.current!.srcObject = s;
      await vid.current!.play();
      const f = await landmarker();
      const loop = () => {
        const v = vid.current;
        const S = st.current;
        if (v && v.readyState >= 2) {
          const fr = measure(f, v, performance.now(), S.eye, work.current!, S.debug ? dbg.current! : undefined);
          S.fs = [...S.fs.slice(-30), fr];
          S.rec?.push(fr);
          if (S.ph === "align") {
            const cs = ready(S.fs);
            setChecks(cs);
            S.okRun = cs.every((c) => c.ok) ? S.okRun + 1 : 0;
            if (S.okRun > 25 && !S.busy) run();
          }
        }
        S.raf = requestAnimationFrame(loop);
      };
      st.current.raf = requestAnimationFrame(loop);
    } catch (e) {
      st.current.s?.getTracks().forEach((t) => t.stop());
      st.current.s = null;
      setErr(e instanceof Error && e.name === "NotAllowedError" ? "Camera permission was blocked. Allow it in the browser settings and try again." : "Could not open the camera.");
      setPh("prep");
    }
  }

  async function run() {
    const S = st.current;
    S.busy = true;
    for (const n of [3, 2, 1]) {
      setCount(n);
      beep(660, 80);
      await wait(700);
      if (!ready(S.fs).every((c) => c.ok)) {
        setCount(null);
        S.okRun = 0;
        S.busy = false;
        return;
      }
    }
    setCount(null);
    S.rec = [];
    setPh("dark");
    await wait(1500);
    const flash = performance.now();
    setPh("flash");
    await wait(2500);
    const r = reflex(S.rec, flash);
    S.rec = null;
    setOut(r);
    setPh("done");
    beep(990, 120);
    S.busy = false;
  }

  function again() {
    setOut(null);
    st.current.okRun = 0;
    setPh("align");
  }

  const v = out ? verdict(out) : null;
  const cover = ph === "dark" ? "bg-black" : ph === "flash" ? "bg-white" : "";

  return (
    <Page title="Pupil light test" intro="The screen flashes and the camera times how fast your pupil shrinks. One eye at a time.">
      {err && <p className="text-alert">{err}</p>}

      {ph === "prep" && <Prep items={PREP} onAll={open} />}

      {ph !== "prep" && (
        <>
          <div className="flex gap-2" role="group" aria-label="Which eye">
            {(["r", "l"] as Eye[]).map((e) => (
              <button key={e} type="button" aria-pressed={eye === e} onClick={() => setEye(e)} disabled={ph !== "align" && ph !== "done"} className="min-h-11 flex-1 rounded-lg border border-edge aria-pressed:border-accent aria-pressed:text-accent">
                {e === "r" ? "Right eye" : "Left eye"}
              </button>
            ))}
          </div>
          <video ref={vid} playsInline muted className={`aspect-[4/3] w-full -scale-x-100 rounded-lg bg-black object-cover ${ph === "align" ? "" : "hidden"}`} />
          {ph === "align" && <Status checks={checks} count={count} />}
          {ph === "align" && <p className="text-sm text-dim">The test starts on its own once everything is ready. Keep looking at the camera when the screen goes dark, then bright.</p>}
        </>
      )}

      {v && <Verdict tone={v.tone} title={v.title} body={v.body} nums={v.nums} again={again} />}

      {ph !== "prep" && (
        <details onToggle={(e) => setDebug((e.target as HTMLDetailsElement).open)} className="text-sm text-dim">
          <summary className="cursor-pointer">Technical view</summary>
          <p className="mt-2">Highlighted pixels are what the app counts as pupil.</p>
          <canvas ref={dbg} className="mt-2 size-40 rounded bg-black [image-rendering:pixelated]" />
        </details>
      )}
      <canvas ref={work} className="hidden" />
      {cover && <div className={`fixed inset-0 z-50 ${cover}`} />}
    </Page>
  );
}

function verdict(r: Reflex): { tone: Tone; title: string; body: string; nums?: [string, string][] } {
  const nums: [string, string][] = [
    ["Reaction time", Number.isFinite(r.lat) ? `${Math.round(r.lat)} ms` : "–"],
    ["Pupil shrank by", Number.isFinite(r.con) ? `${Math.round(r.con * 100)}%` : "–"],
  ];
  if (!r.ok || !Number.isFinite(r.con)) {
    return { tone: "fail", title: "Couldn't measure", body: "The camera lost your eye during the test. Hold the phone steadier, keep your eye open, and try again.", nums };
  }
  if (r.con < 0.05) {
    return { tone: "fail", title: "No clear reaction seen", body: "Usually this means the camera could not separate the pupil from the iris, which is common with dark eyes. Try brighter room light. If it repeats, use the examiner check instead.", nums };
  }
  if (r.con >= 0.12 && r.lat >= 120 && r.lat <= 500) {
    return { tone: "ok", title: "Looks normal", body: "Your pupil reacted to light at a normal speed and by a normal amount.", nums };
  }
  return { tone: "check", title: "Worth a recheck", body: r.lat > 500 ? "Your pupil reacted more slowly than usual for a healthy eye. Test again; if it repeats, compare with the other eye." : "Your pupil shrank less than usual. Test again in brighter light; if it repeats, compare with the other eye.", nums };
}
