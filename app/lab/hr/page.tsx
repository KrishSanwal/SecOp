"use client";

import { useEffect, useRef, useState } from "react";
import { beep, Page, Prep, Status, Verdict, wait, type Tone } from "@/components/lab";
import { closeRear, finger, measureHr, openRear, type PpgResult } from "@/lib/ppg";

type Ph = "prep" | "align" | "run" | "done";
const SECS = 20;

const PREP = [
  "Sit down and rest for a minute",
  "Rest your arm on a table, hand relaxed",
  "Warm hands work best: rub them if they are cold",
  "Find the back camera and the flash next to it",
];

export default function HrLab() {
  const vid = useRef<HTMLVideoElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const S = useRef({ s: null as MediaStream | null, on: 0, timer: 0 as ReturnType<typeof setInterval> | 0, busy: false });
  const [ph, setPh] = useState<Ph>("prep");
  const [torch, setTorch] = useState(true);
  const [on, setOn] = useState(false);
  const [hard, setHard] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [left, setLeft] = useState(SECS);
  const [out, setOut] = useState<PpgResult | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const s = S.current;
    return () => {
      if (s.timer) clearInterval(s.timer);
      closeRear(s.s);
    };
  }, []);

  async function open() {
    setErr("");
    try {
      const { s, torch } = await openRear();
      S.current.s = s;
      setTorch(torch);
      const v = vid.current;
      if (!v) throw new Error("preview not mounted");
      v.srcObject = s;
      await v.play().catch(() => {});
      setPh("align");
      watch();
    } catch (e) {
      await closeRear(S.current.s);
      S.current.s = null;
      const m = e instanceof Error ? e : new Error(String(e));
      setErr(
        m.name === "NotAllowedError"
          ? "Camera permission was blocked. Allow it in the browser settings and try again."
          : m.name === "NotReadableError"
            ? "Another app is using the camera. Close it and try again."
            : `Could not open the back camera: ${m.message || m.name}`,
      );
      setPh("prep");
    }
  }

  function watch() {
    const s = S.current;
    s.on = 0;
    s.timer = setInterval(() => {
      const f = finger(vid.current!, cv.current!);
      setOn(f.on);
      setHard(f.hard);
      s.on = f.on && !f.hard ? s.on + 1 : 0;
      if (s.on >= 6 && !s.busy) run();
    }, 150);
  }

  async function run() {
    const s = S.current;
    s.busy = true;
    for (const n of [3, 2, 1]) {
      setCount(n);
      await wait(600);
      if (!finger(vid.current!, cv.current!).on) {
        setCount(null);
        s.busy = false;
        return;
      }
    }
    setCount(null);
    if (s.timer) clearInterval(s.timer);
    beep(660, 100);
    setPh("run");
    const r = measureHr(vid.current!, SECS, (p) => {
      setLeft(Math.max(0, Math.ceil(SECS - p.t / 1000)));
      setOn(p.on);
      setHard(p.hard);
    });
    const res = await r.done;
    beep(990, 140);
    await closeRear(s.s);
    s.s = null;
    setOut(res);
    setPh("done");
    s.busy = false;
  }

  async function again() {
    setOut(null);
    setLeft(SECS);
    await open();
  }

  const v = out ? verdict(out) : null;

  return (
    <Page title="Heart rate" intro="Your fingertip over the camera lets the phone see each heartbeat as a tiny change in colour.">
      {err && <p className="text-alert">{err}</p>}
      {ph === "prep" && <Prep items={PREP} onAll={open} />}

      {(ph === "align" || ph === "run") && (
        <>
          {!torch && <p className="text-alert">This browser can&apos;t turn on the flash. Use a bright room, or try Chrome on Android.</p>}
          {ph === "align" && (
            <>
              <p>Cover the back camera <b>and</b> the flash with the pad of your index finger. Press lightly; pressing hard stops the blood flow.</p>
              <Status checks={[{ ok: on, fix: "Cover the camera fully with your fingertip" }, { ok: !hard, fix: "Press more lightly" }]} count={count} />
            </>
          )}
          {ph === "run" && (
            <div className="rounded-lg border border-accent p-4" role="status">
              <p className="text-sm text-accent">Measuring</p>
              <p className="text-4xl font-semibold tabular-nums">{left}s</p>
              <p className={on && !hard ? "text-dim" : "text-alert"}>{!on ? "Finger moved: cover the camera again" : hard ? "Press more lightly" : "Keep still, don't press harder"}</p>
            </div>
          )}
        </>
      )}
      <video ref={vid} playsInline muted autoPlay className="hidden" />
      <canvas ref={cv} className="hidden" />

      {v && <Verdict tone={v.tone} title={v.title} body={v.body} nums={v.nums} again={again} />}
    </Page>
  );
}

function verdict(r: PpgResult): { tone: Tone; title: string; body: string; nums?: [string, string][] } {
  const nums: [string, string][] = [
    ["Heart rate", Number.isFinite(r.bpm) ? `${Math.round(r.bpm)} bpm` : "–"],
    ["Finger on camera", `${Math.round(r.q * 100)}% of the time`],
  ];
  if (!Number.isFinite(r.bpm) || r.q < 0.6) {
    return { tone: "fail", title: "Couldn't measure", body: r.q < 0.6 ? "Your finger wasn't covering the camera for most of the test. Rest your hand on a table and try again." : "The signal was too noisy. Press more lightly, keep completely still, and try again.", nums };
  }
  if (r.bpm >= 50 && r.bpm <= 100) return { tone: "ok", title: "Looks normal", body: "A normal resting heart rate is 50 to 100 beats a minute.", nums };
  return {
    tone: "check",
    title: "Worth a recheck",
    body: r.bpm > 100 ? "That's faster than a normal resting rate. Sit quietly for two minutes and test again." : "That's slower than a typical resting rate. Fit people can be this low; test again to confirm.",
    nums,
  };
}
