"use client";

import { useEffect, useRef, useState } from "react";
import { closeRear, finger, measureHr, openRear, thump, type PpgRun } from "@/lib/ppg";
import { landmarker, measure, ready, reflex, type Check, type Eye, type Frame } from "@/lib/pupil";
import { measureSway, type SwayResult } from "@/lib/sway";
import { beep, Status, Verdict, wait } from "./lab";
import { Big, ghost } from "./ui";

const HR_SECS = 20;
const BAL_SECS = 30;

function draw(c: HTMLCanvasElement | null, w: number[]) {
  if (!c || w.length < 2) return;
  const g = c.getContext("2d")!;
  const W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const m = Math.max(1e-6, ...w.map(Math.abs));
  g.strokeStyle = getComputedStyle(c).getPropertyValue("--accent") || "#e0b45a";
  g.lineWidth = 3;
  g.lineJoin = "round";
  g.beginPath();
  w.forEach((v, i) => {
    const x = (i / (w.length - 1)) * W;
    const y = H / 2 - (v / m) * (H * 0.42);
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  });
  g.stroke();
}

function Fail({ why, again, other, otherLabel }: { why: string; again: () => void; other: () => void; otherLabel: string }) {
  return (
    <>
      <Verdict tone="fail" title="Couldn't measure" body={why} again={again} againLabel="Try again" note="Or switch to the manual method below. It scores the same way." />
      <button type="button" onClick={other} className={ghost}>
        {otherLabel}
      </button>
    </>
  );
}

export function CamHr({ onRead, onHand }: { onRead: (bpm: number) => void; onHand: () => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const read = useRef(onRead);
  const [go, setGo] = useState(0);
  const [ph, setPh] = useState<"open" | "align" | "run" | "fail">("open");
  const [torch, setTorch] = useState(true);
  const [on, setOn] = useState(false);
  const [hard, setHard] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [left, setLeft] = useState(HR_SECS);
  const [why, setWhy] = useState("");
  const [bpm, setBpm] = useState(NaN);
  const wave = useRef<HTMLCanvasElement>(null);
  const [beat, setBeat] = useState(false);
  useEffect(() => {
    read.current = onRead;
  });

  useEffect(() => {
    const k = { live: true, s: null as MediaStream | null, run: null as PpgRun | null };
    (async () => {
      try {
        const { s, torch } = await openRear();
        if (!k.live) return closeRear(s);
        k.s = s;
        setTorch(torch);
        const v = vid.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        setPh("align");

        for (let ok = 0; k.live; ) {
          await wait(150);
          const f = finger(v, cv.current!);
          setOn(f.on);
          setHard(f.hard);
          ok = f.on && !f.hard ? ok + 1 : 0;
          if (ok < 6) continue;
          let held = true;
          for (const n of [3, 2, 1]) {
            setCount(n);
            beep(660, 90);
            await wait(600);
            if (!k.live) return;
            if (!finger(v, cv.current!).on) held = false;
          }
          setCount(null);
          if (held) break;
          ok = 0;
        }
        if (!k.live) return;

        beep(880, 120);
        setPh("run");
        k.run = measureHr(v, HR_SECS, (p) => {
          setLeft(Math.max(0, Math.ceil(HR_SECS - p.t / 1000)));
          setOn(p.on);
          setHard(p.hard);
          if (Number.isFinite(p.bpm)) setBpm(p.bpm);
          if (p.beat) {
            setBeat(true);
            setTimeout(() => setBeat(false), 120);
          }
          draw(wave.current, p.wave);
        });
        const r = await k.run.done;
        if (!k.live) return;
        beep(990, 140);
        await closeRear(k.s);
        k.s = null;
        if (Number.isFinite(r.bpm)) thump(r.bpm, 5);
        if (!Number.isFinite(r.bpm) || r.q < 0.6) {
          setWhy(r.q < 0.6 ? "The fingertip was off the camera for much of the reading. Rest the hand on a table and try again." : "The pulse signal was too noisy. Press more lightly, keep completely still, and try again.");
          setPh("fail");
          return;
        }
        read.current(r.bpm);
      } catch (e) {
        await closeRear(k.s);
        k.s = null;
        if (!k.live) return;
        const m = e instanceof Error ? e : new Error(String(e));
        setWhy(
          m.name === "NotAllowedError"
            ? "Camera permission was blocked. Allow it in the browser settings, or count by hand."
            : m.name === "NotReadableError"
              ? "Another app is using the camera. Close it and try again."
              : `Could not open the back camera: ${m.message || m.name}`,
        );
        setPh("fail");
      }
    })();
    return () => {
      k.live = false;
      k.run?.stop();
      closeRear(k.s);
    };
  }, [go]);

  function again() {
    setPh("open");
    setLeft(HR_SECS);
    setGo((g) => g + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {ph === "open" && <p className="text-dim">Opening the back camera…</p>}
      {ph === "align" && (
        <>
          {!torch && <p className="text-alert">This browser can&apos;t turn on the flash. Use a bright room, or try Chrome on Android.</p>}
          <p className="text-lg">Cover the back camera and the flash with a fingertip. Press lightly and keep still.</p>
          <Status checks={[{ ok: on, fix: "Cover the camera fully with a fingertip" }, { ok: !hard, fix: "Press more lightly" }]} count={count} />
          <button type="button" onClick={onHand} className={`${ghost} text-dim`}>
            Count the pulse by hand instead
          </button>
        </>
      )}
      {ph === "run" && (
        <div role="status" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p className="text-dim">Reading the pulse</p>
            <p className="text-dim tabular-nums">{left}s</p>
          </div>
          <div className="relative overflow-hidden rounded-xl bg-panel">
            <canvas ref={wave} width={640} height={160} className="h-28 w-full" aria-hidden />
            <span className={`absolute top-3 right-3 size-3 rounded-full bg-alert transition-transform duration-100 ${beat ? "scale-150" : "scale-75 opacity-60"}`} aria-hidden />
          </div>
          <div className="flex items-baseline gap-2">
            <Big>{Number.isFinite(bpm) ? Math.round(bpm) : "–"}</Big>
            <span className="text-dim">bpm, settling</span>
          </div>
          <p className={on && !hard ? "text-dim" : "text-alert"}>{!on ? "Finger moved: cover the camera again" : hard ? "Press more lightly" : "Keep still. The phone will pulse with your heartbeat when done."}</p>
        </div>
      )}
      {ph === "fail" && <Fail why={why} again={again} other={onHand} otherLabel="Count the pulse by hand" />}
      <video ref={vid} playsInline muted autoPlay className="hidden" />
      <canvas ref={cv} className="hidden" />
    </div>
  );
}

export function MotionBal({ onRead, onHand }: { onRead: (r: SwayResult) => void; onHand: () => void }) {
  const read = useRef(onRead);
  const [go, setGo] = useState(0);
  const [ph, setPh] = useState<"settle" | "run" | "fail">("settle");
  const [still, setStill] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [left, setLeft] = useState(BAL_SECS);
  const [why, setWhy] = useState("");
  useEffect(() => {
    read.current = onRead;
  });

  useEffect(() => {
    const k = { live: true, stop: () => {} };
    (async () => {
      for (let ok = 0; ok < 2; ) {
        const r = await measureSway(1.2).done;
        if (!k.live) return;
        if (r.dead) {
          setWhy("The motion sensor sent no data. Try again, or rate the sway by eye.");
          setPh("fail");
          return;
        }
        setStill(r.rms < 0.3);
        ok = r.rms < 0.3 ? ok + 1 : 0;
      }
      for (const n of [3, 2, 1]) {
        setCount(n);
        beep(660, 90);
        await wait(800);
        if (!k.live) return;
      }
      setCount(null);
      beep(440, 500);
      navigator.vibrate?.(300);
      setPh("run");
      const m = measureSway(BAL_SECS, (p) => setLeft(Math.max(0, Math.ceil(BAL_SECS - p.t / 1000))));
      k.stop = m.stop;
      const r = await m.done;
      if (!k.live) return;
      beep(990, 150);
      await wait(200);
      beep(990, 150);
      navigator.vibrate?.([150, 100, 150]);
      if (r.dead || r.n < 20) {
        setWhy("The motion sensor didn't send enough data. Try again, or rate the sway by eye.");
        setPh("fail");
        return;
      }
      read.current(r);
    })();
    return () => {
      k.live = false;
      k.stop();
    };
  }, [go]);

  function again() {
    setPh("settle");
    setStill(false);
    setLeft(BAL_SECS);
    setGo((g) => g + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {ph === "settle" && (
        <>
          <p className="text-lg">Hold the phone flat on your chest with both hands, feet together. Close your eyes at the long beep. Open them at two short beeps.</p>
          <Status checks={[{ ok: still, fix: "Hold the phone still against the chest" }]} count={count} />
          <button type="button" onClick={onHand} className={`${ghost} text-dim`}>
            Rate the sway by eye instead
          </button>
        </>
      )}
      {ph === "run" && (
        <div role="status" className="flex flex-col gap-2">
          <p className="text-dim">Eyes closed, hold still</p>
          <Big>{left}s</Big>
          <p className="text-dim">Examiner, stand close. If they step, the test stops on its own.</p>
        </div>
      )}
      {ph === "fail" && <Fail why={why} again={again} other={onHand} otherLabel="Rate the sway by eye" />}
    </div>
  );
}

export type EyeRead = { con: number; lat: number; ok: boolean; curve: number[] };

export function CamPupil({ onRead, onHand }: { onRead: (r: { r: EyeRead; l: EyeRead }) => void; onHand: () => void }) {
  const vid = useRef<HTMLVideoElement>(null);
  const work = useRef<HTMLCanvasElement>(null);
  const read = useRef(onRead);
  const [go, setGo] = useState(0);
  const [ph, setPh] = useState<"open" | "align" | "run" | "fail">("open");
  const [eye, setEye] = useState<Eye>("r");
  const [front, setFront] = useState(false);
  const [checks, setChecks] = useState<Check[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState<"" | "dark" | "white">("");
  const [why, setWhy] = useState("");
  useEffect(() => {
    read.current = onRead;
  });

  useEffect(() => {
    const k = { live: true, s: null as MediaStream | null };
    const torch = async (on: boolean) => {
      try {
        await k.s?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      } catch {}
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser has no camera access.");
        const get = (fm: "user" | "environment") =>
          navigator.mediaDevices
            .getUserMedia({ video: { facingMode: { ideal: fm }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
            .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
        let s = await get("environment");
        const caps = (s.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as { torch?: boolean };
        const useFront = !caps.torch;
        if (useFront) {
          s.getTracks().forEach((t) => t.stop());
          s = await get("user");
        }
        if (!k.live) return s.getTracks().forEach((t) => t.stop());
        k.s = s;
        setFront(useFront);
        const v = vid.current!;
        v.srcObject = s;
        await v.play().catch(() => {});
        const f = await landmarker();
        setPh("align");

        const out = {} as { r: EyeRead; l: EyeRead };
        for (const e of ["r", "l"] as Eye[]) {
          setEye(e);
          let fs: Frame[] = [];
          const grab = () => {
            const fr = measure(f, v, performance.now(), e, work.current!);
            fs = [...fs.slice(-30), fr];
            return fr;
          };
          for (let ok = 0; k.live; ) {
            await wait(33);
            grab();
            const cs = ready(fs);
            setChecks(cs);
            ok = cs.every((c) => c.ok) ? ok + 1 : Math.max(0, ok - 2);
            if (ok < 12) continue;
            let good = 0, all = 0;
            for (const n of [3, 2, 1]) {
              setCount(n);
              beep(660, 80);
              const t = performance.now();
              while (performance.now() - t < 700) {
                await wait(33);
                grab();
                all++;
                if (ready(fs).every((c) => c.ok)) good++;
              }
            }
            setCount(null);
            if (good >= all * 0.6 && ready(fs)[0].ok) break;
            ok = 0;
          }
          if (!k.live) return;
          setPh("run");
          const rec: Frame[] = [];
          const until = async (ms: number) => { const t = performance.now(); while (performance.now() - t < ms) { await wait(16); rec.push(grab()); } };
          if (useFront) setFlash("dark");
          await until(1500);
          if (useFront) setFlash("white");
          else await torch(true);
          const at = performance.now();
          await until(2500);
          setFlash("");
          if (!useFront) await torch(false);
          beep(990, 120);
          const rf = reflex(rec, at);
          out[e] = { con: rf.con, lat: rf.lat, ok: rf.ok && Number.isFinite(rf.con) && rf.con >= 0.05, curve: rf.curve };
          setPh("align");
        }
        await closeRear(k.s);
        k.s = null;
        if (!out.r.ok && !out.l.ok) {
          setWhy("The camera couldn't separate the pupil from the iris. Common with dark eyes: add light from the front, or a red filter over the lens. Or rate by eye.");
          setPh("fail");
          return;
        }
        read.current(out);
      } catch (e) {
        await closeRear(k.s);
        k.s = null;
        if (!k.live) return;
        const m = e instanceof Error ? e : new Error(String(e));
        setWhy(m.name === "NotAllowedError" ? "Camera permission was blocked. Allow it in the browser settings, or rate by eye." : `Could not start the camera: ${m.message || m.name}`);
        setPh("fail");
      }
    })();
    return () => {
      k.live = false;
      closeRear(k.s);
    };
  }, [go]);

  const name = eye === "r" ? "right" : "left";
  return (
    <div className="flex flex-col gap-4">
      {ph === "open" && <p className="text-dim">Opening the camera…</p>}
      {(ph === "align" || ph === "run") && (
        <p className="text-lg">
          {front ? "Hold the front camera 10 to 15 cm from the subject's " : "Hold the back camera 15 to 20 cm from the subject's "}
          <b>{name} eye</b>. Subject looks far away, eye wide open. Steady trick: hold it with both hands and rest a little finger on the subject&apos;s cheekbone, so the phone moves with their head.
        </p>
      )}
      <video ref={vid} playsInline muted autoPlay className={`aspect-[4/3] w-full rounded-xl bg-black object-cover ${front ? "-scale-x-100" : ""} ${ph === "align" || ph === "run" ? "" : "hidden"}`} />
      {ph === "align" && <Status checks={checks} count={count} />}
      {ph === "run" && <p role="status" className="text-lg font-semibold">Measuring the {name} eye. Keep still.</p>}
      {ph === "align" && (
        <button type="button" onClick={onHand} className={`${ghost} text-dim`}>
          Rate by eye instead
        </button>
      )}
      {ph === "fail" && <Fail why={why} again={() => { setPh("open"); setGo((g) => g + 1); }} other={onHand} otherLabel="Rate by eye" />}
      <canvas ref={work} className="hidden" />
      {flash && <div className={`fixed inset-0 z-50 ${flash === "dark" ? "bg-black" : "bg-white"}`} />}
    </div>
  );
}
