"use client";

import { useEffect, useRef, useState } from "react";
import { beep, Page, Prep, Status, Verdict, wait, type Tone } from "@/components/lab";
import { askMotion, measureSway, type SwayResult } from "@/lib/sway";

type Ph = "prep" | "align" | "run" | "done";
const SECS = 30;

const PREP = [
  "Shoes off, on a flat floor",
  "Clear space around you; a wall or person within reach",
  "Sound on: beeps tell you when to close and open your eyes",
  "Hold the phone flat against the middle of your chest with both hands",
  "Feet together, arms in, look straight ahead",
];

export default function SwayLab() {
  const [ph, setPh] = useState<Ph>("prep");
  const [still, setStill] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [left, setLeft] = useState(SECS);
  const [out, setOut] = useState<SwayResult | null>(null);
  const [err, setErr] = useState("");
  const live = useRef(true);

  useEffect(() => () => { live.current = false; }, []);

  async function start() {
    setErr("");
    if (!(await askMotion())) {
      setErr("This phone isn't sharing its motion sensor. On iPhone, allow Motion & Orientation access when asked.");
      return;
    }
    setPh("align");
    await settle();
  }

  async function settle() {
    let ok = 0;
    while (live.current && ok < 2) {
      const r = await measureSway(1.2).done;
      if (r.dead) {
        setErr("The motion sensor sent no data. Try another browser or phone.");
        setPh("prep");
        return;
      }
      const s = r.rms < 0.3;
      setStill(s);
      ok = s ? ok + 1 : 0;
    }
    for (const n of [3, 2, 1]) {
      setCount(n);
      beep(660, 90);
      await wait(800);
    }
    setCount(null);
    beep(440, 500);
    navigator.vibrate?.(300);
    setPh("run");
    const r = measureSway(SECS, (p) => setLeft(Math.max(0, Math.ceil(SECS - p.t / 1000))));
    const res = await r.done;
    beep(990, 150);
    await wait(200);
    beep(990, 150);
    navigator.vibrate?.([150, 100, 150]);
    setOut(res);
    setPh("done");
  }

  function again() {
    setOut(null);
    setLeft(SECS);
    setPh("align");
    settle();
  }

  const v = out ? verdict(out) : null;

  return (
    <Page title="Balance, eyes closed" intro="The phone's motion sensor measures how much you sway. Space travel upsets the inner ear, so this shows up after landing.">
      {err && <p className="text-alert">{err}</p>}
      {ph === "prep" && <Prep items={PREP} onAll={start} />}

      {ph === "align" && (
        <>
          <Status checks={[{ ok: still, fix: "Hold the phone still against your chest" }]} count={count} />
          <p className="text-sm text-dim">When you hear the long beep, close your eyes. Two short beeps mean you can open them.</p>
        </>
      )}

      {ph === "run" && (
        <div className="rounded-lg border border-accent p-4" role="status">
          <p className="text-sm text-accent">Eyes closed, hold still</p>
          <p className="text-4xl font-semibold tabular-nums">{left}s</p>
          <p className="text-dim">If you lose your balance, just step. The test stops on its own.</p>
        </div>
      )}

      {v && <Verdict tone={v.tone} title={v.title} body={v.body} nums={v.nums} again={again} />}
    </Page>
  );
}

function verdict(r: SwayResult): { tone: Tone; title: string; body: string; nums?: [string, string][] } {
  const nums: [string, string][] = [
    ["Sway", `${r.rms.toFixed(2)} m/s²`],
    ["Held for", `${r.secs} s`],
  ];
  if (r.dead || r.n < 20) return { tone: "fail", title: "Couldn't measure", body: "The motion sensor didn't send enough data. Try again, or use another phone.", nums };
  if (r.out) return { tone: "check", title: "Worth a recheck", body: `You stepped or jolted after ${r.secs} seconds. Sit down for a minute. If it happens again, note any dizziness or spinning.`, nums };
  if (r.rms < 0.25) return { tone: "ok", title: "Looks normal", body: "You held steady for the full 30 seconds with your eyes closed.", nums };
  return { tone: "check", title: "Worth a recheck", body: "You stayed up but swayed more than a steady stance. Test again; if it repeats, mention dizziness or nausea to your crewmate.", nums };
}
