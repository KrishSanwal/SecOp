"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCrew, putExam, uid } from "@/lib/db";
import type { PromptId } from "@/lib/prompts";
import { hush, say } from "@/lib/say";
import { median } from "@/lib/scoring";
import type { Crew, Pupil, Results, Sway } from "@/lib/types";
import { Bottom, btn, Choice, Cue, ghost, primary, Stepper, Talk, Timed, useCues } from "./ui";

const STATIONS = ["Pupils", "Heart rate", "Balance", "Sleep and mood", "Reaction"] as const;
const HINTS = ["Light reaction in each eye", "Sitting, then standing", "Eyes closed, 30 seconds", "Three questions", "Ten taps"];

type Part = Partial<Results>;

export default function Exam() {
  const q = useSearchParams();
  const sid = q.get("subj") ?? "";
  const xid = q.get("exr") ?? "";
  const [pair, setPair] = useState<[Crew, Crew] | null>(null);
  const [err, setErr] = useState("");
  const [n, setN] = useState(-1);
  const [res, setRes] = useState<Part>({});
  const [voice, setVoice] = useState(true);
  const on = useRef(true);
  const [saved, setSaved] = useState("");
  const [leave, setLeave] = useState(false);
  const ok = sid && xid && sid !== xid;
  const bad = ok ? err : "Pick two different crew members first.";

  useEffect(() => {
    if (!ok) return;
    Promise.all([getCrew(sid), getCrew(xid)])
      .then(([s, x]) => (s && x ? setPair([s, x]) : setErr("One of these crew members is not on this device.")))
      .catch(() => setErr("Could not open crew records."));
  }, [ok, sid, xid]);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let live = true;
    navigator.wakeLock?.request("screen").then(
      (l) => {
        if (live) lock = l;
        else l.release().catch(() => {});
      },
      () => {},
    );
    return () => {
      live = false;
      lock?.release().catch(() => {});
      hush();
    };
  }, []);

  const talk = useCallback((id: PromptId) => (on.current ? say(id) : Promise.resolve(true)), []);

  function mute() {
    on.current = !voice;
    if (voice) hush();
    setVoice(!voice);
  }

  async function next(p: Part) {
    const all = { ...res, ...p };
    setRes(all);
    if (n < STATIONS.length - 1) return setN(n + 1);
    const id = uid();
    try {
      await putExam({ id, subj: sid, exr: xid, at: Date.now(), res: all as Results });
    } catch {
      return setErr("Could not save the exam. Storage may be full or blocked.");
    }
    setSaved(id);
    talk("done");
  }

  if (bad) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">Can&apos;t start the exam</h1>
        <p role="alert" className="text-lg text-alert">
          {bad}
        </p>
        <Link href="/" className={ghost}>
          Back to crew
        </Link>
      </div>
    );
  }
  if (!pair) return <p className="text-dim">Loading exam…</p>;
  const [s, x] = pair;

  if (saved) {
    return (
      <>
        <section className="flex flex-col items-start gap-4">
          <svg viewBox="0 0 24 24" className="size-14 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M7.5 12.5l3 3 6-6.5" />
          </svg>
          <h1 className="text-[2.5rem] leading-[1.15] font-bold tracking-tight">Exam complete</h1>
          <p className="text-lg text-dim">Saved on this device. Swap roles when you are ready.</p>
        </section>
        <Bottom>
          <Link href={{ pathname: "/result", query: { id: saved } }} className={primary}>
            See results
          </Link>
        </Bottom>
      </>
    );
  }

  return (
    <Talk.Provider value={talk}>
      <div className="flex items-center justify-between gap-2">
        {leave ? (
          <div className="flex items-center gap-2" role="group" aria-label="Leave the exam?">
            <Link href="/" className={`${ghost} border-alert/60 text-alert`}>
              Leave, discard
            </Link>
            <button type="button" onClick={() => setLeave(false)} className={ghost}>
              Stay
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setLeave(true)} className={`${btn} -ml-3 text-dim hover:text-ink`}>
            Exit
          </button>
        )}
        <button type="button" aria-pressed={voice} onClick={mute} className={`${btn} -mr-3 text-dim hover:text-ink`}>
          {voice ? "Voice on" : "Voice off"}
        </button>
      </div>

      {n < 0 ? (
        <Intro s={s} x={x} onGo={() => setN(0)} />
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <ol className="grid grid-cols-5 gap-1.5" aria-label="Stations">
              {STATIONS.map((t, i) => (
                <li key={t} aria-current={i === n ? "step" : undefined} className={`h-1.5 rounded-full ${i <= n ? "bg-accent" : "bg-rule"}`}>
                  <span className="sr-only">
                    {t}
                    {i < n ? ", done" : ""}
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-dim">
              Station {n + 1} of 5. {x.name} examines {s.name}.
            </p>
            <h1 className="text-[2.25rem] leading-tight font-bold tracking-tight">{STATIONS[n]}</h1>
          </header>
          {n === 0 && <Pupils key="p" onDone={next} />}
          {n === 1 && <Heart key="h" onDone={next} />}
          {n === 2 && <Balance key="b" onDone={next} />}
          {n === 3 && <Mood key="m" onDone={next} />}
          {n === 4 && <React10 key="r" onDone={next} />}
        </>
      )}
    </Talk.Provider>
  );
}

function Intro({ s, x, onGo }: { s: Crew; x: Crew; onGo: () => void }) {
  useCues("start");
  return (
    <>
      <section className="flex flex-col gap-6">
        <h1 className="text-[2.5rem] leading-[1.15] font-bold tracking-tight text-balance">
          {x.name} <span className="font-normal text-dim">examines</span> {s.name}
        </h1>
        <Cue id="start" />
        <ol className="flex flex-col divide-y divide-rule border-y border-rule">
          {STATIONS.map((t, i) => (
            <li key={t} className="flex items-baseline gap-4 py-3">
              <span className="w-4 text-dim tabular-nums">{i + 1}</span>
              <span className="font-semibold">{t}</span>
              <span className="ml-auto text-right text-dim">{HINTS[i]}</span>
            </li>
          ))}
        </ol>
      </section>
      <Bottom>
        <button type="button" onClick={onGo} className={primary}>
          Begin station 1
        </button>
      </Bottom>
    </>
  );
}

function Pupils({ onDone }: { onDone: (p: Part) => void }) {
  const [step, setStep] = useState<"left" | "right" | "rate">("left");
  const [l, setL] = useState<Pupil | null>(null);
  const [r, setR] = useState<Pupil | null>(null);
  const talk = useContext(Talk);
  useCues("pupil_intro", "pupil_left");
  const opts: [Pupil, string, string][] = [
    ["brisk", "Brisk", "shrinks fast"],
    ["sluggish", "Sluggish", "shrinks slowly"],
    ["unequal", "Unequal", "size differs"],
  ];
  const go = (s: typeof step, id: PromptId) => {
    setStep(s);
    talk(id);
  };

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "left" && (
          <>
            <Cue id="pupil_intro" />
            <Cue id="pupil_left" big />
          </>
        )}
        {step === "right" && <Cue id="pupil_right" big />}
        {step === "rate" && (
          <>
            <Cue id="pupil_rate" />
            <Choice name="pl" legend="Left eye" opts={opts} value={l} onChange={setL} />
            <Choice name="pr" legend="Right eye" opts={opts} value={r} onChange={setR} />
          </>
        )}
      </section>
      <Bottom>
        {step === "left" && (
          <button type="button" onClick={() => go("right", "pupil_right")} className={primary}>
            Done, right eye next
          </button>
        )}
        {step === "right" && (
          <button type="button" onClick={() => go("rate", "pupil_rate")} className={primary}>
            Done, rate the pupils
          </button>
        )}
        {step === "rate" && (
          <button type="button" disabled={!l || !r} onClick={() => l && r && onDone({ pupils: { l, r } })} className={primary}>
            {l && r ? "Next: heart rate" : "Rate both eyes"}
          </button>
        )}
      </Bottom>
    </>
  );
}

const okCount = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 5 && n <= 60;
};

function Count({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <Stepper id={id} label={label} hint="Beats counted in 15 seconds" value={value} onChange={onChange} min={5} max={60} step={1} start={18} />
      <p className="text-dim" aria-live="polite">
        {okCount(value) ? `That is ${Number(value) * 4} beats per minute.` : value ? "Enter a count from 5 to 60." : ""}
      </p>
    </>
  );
}

function Heart({ onDone }: { onDone: (p: Part) => void }) {
  type Step = "ready" | "sit" | "sitN" | "up" | "wait" | "stand" | "standN";
  const [step, setStep] = useState<Step>("ready");
  const [sit, setSit] = useState("");
  const [stand, setStand] = useState("");
  useCues("hr_intro");

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "ready" && <Cue id="hr_intro" big />}
        {step === "sit" && <Timed key="sit" cue="hr_sit" end="stop" secs={15} label="Count the sitting pulse" onDone={() => setStep("sitN")} />}
        {step === "sitN" && <Count id="sit" label="Sitting count" value={sit} onChange={setSit} />}
        {step === "up" && <p className="text-2xl leading-snug font-semibold">Subject stands up. Then tap the button to start the one-minute wait.</p>}
        {step === "wait" && <Timed key="wait" cue="hr_stand" secs={60} label="Standing still" onDone={() => setStep("stand")} skip />}
        {step === "stand" && <Timed key="stand" cue="hr_stand_go" end="stop" secs={15} label="Count the standing pulse" onDone={() => setStep("standN")} />}
        {step === "standN" && <Count id="stand" label="Standing count" value={stand} onChange={setStand} />}
      </section>
      <Bottom>
        {step === "ready" && (
          <button type="button" onClick={() => setStep("sit")} className={primary}>
            Start the 15-second count
          </button>
        )}
        {step === "sitN" && (
          <button type="button" disabled={!okCount(sit)} onClick={() => setStep("up")} className={primary}>
            Save sitting count
          </button>
        )}
        {step === "up" && (
          <button type="button" onClick={() => setStep("wait")} className={primary}>
            Subject is standing
          </button>
        )}
        {step === "standN" && (
          <button type="button" disabled={!okCount(stand)} onClick={() => onDone({ hr: { sit: Number(sit), stand: Number(stand) } })} className={primary}>
            Next: balance
          </button>
        )}
      </Bottom>
    </>
  );
}

function Balance({ onDone }: { onDone: (p: Part) => void }) {
  const [step, setStep] = useState<"ready" | "go" | "rate">("ready");
  const [sway, setSway] = useState<Sway | null>(null);
  const [secs, setSecs] = useState(30);
  const t0 = useRef(0);
  const talk = useContext(Talk);
  useCues("bal_intro");

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "ready" && <Cue id="bal_intro" big />}
        {step === "go" && (
          <Timed key="go" cue="bal_go" end="bal_done" secs={30} label="Eyes closed, hold still" onStart={(t) => (t0.current = t)} onDone={() => setStep("rate")}>
            <button
              type="button"
              onClick={() => {
                const el = t0.current ? Math.round((performance.now() - t0.current) / 1000) : 0;
                setSecs(Math.min(30, el));
                setSway("out");
                setStep("rate");
                talk("bal_done");
              }}
              className={`${btn} min-h-16 w-full border border-alert/60 text-lg text-alert hover:bg-alert/10`}
            >
              Subject stepped out
            </button>
          </Timed>
        )}
        {step === "rate" && (
          <>
            <Cue id="bal_done" />
            <Choice
              name="sway"
              legend="Sway with eyes closed"
              cols="grid-cols-2"
              value={sway}
              onChange={setSway}
              opts={[
                ["none", "None", "steady"],
                ["mild", "Mild", "small wobble"],
                ["marked", "Marked", "large sway"],
                ["out", "Stepped out", "lost balance"],
              ]}
            />
          </>
        )}
      </section>
      <Bottom>
        {step === "ready" && (
          <button
            type="button"
            onClick={() => {
              t0.current = 0;
              setStep("go");
            }}
            className={primary}
          >
            Start 30 seconds
          </button>
        )}
        {step === "rate" && (
          <button type="button" disabled={!sway} onClick={() => sway && onDone({ bal: { sway, secs: sway === "out" ? secs : 30 } })} className={primary}>
            Next: sleep and mood
          </button>
        )}
      </Bottom>
    </>
  );
}

function Mood({ onDone }: { onDone: (p: Part) => void }) {
  const [sleep, setSleep] = useState("");
  const [score, setScore] = useState<"1" | "2" | "3" | "4" | "5" | null>(null);
  const [note, setNote] = useState("");
  useCues("mood_intro", "mood_sleep");
  const h = Number(sleep);
  const ok = sleep !== "" && Number.isFinite(h) && h >= 0 && h <= 24;

  return (
    <>
      <section className="flex flex-col gap-8">
        <Cue id="mood_intro" />
        <div className="flex flex-col gap-2">
          <Cue id="mood_sleep" />
          <Stepper id="sleep" label="Hours of sleep" value={sleep} onChange={setSleep} min={0} max={24} step={0.5} start={7} />
          {sleep !== "" && !ok && <p className="text-alert">Enter hours from 0 to 24.</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Cue id="mood_score" />
          <Choice
            name="mood"
            legend="Mood today"
            cols="grid-cols-5"
            value={score}
            onChange={setScore}
            opts={[
              ["1", "1", "worst"],
              ["2", "2"],
              ["3", "3"],
              ["4", "4"],
              ["5", "5", "best"],
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Cue id="mood_note" />
          <label htmlFor="note" className="text-lg font-semibold">
            Their answer <span className="font-normal text-dim">(optional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            rows={3}
            className="w-full rounded-lg border border-edge bg-panel p-4 text-lg focus:border-accent focus:outline-none"
          />
        </div>
      </section>
      <Bottom>
        <button
          type="button"
          disabled={!ok || !score}
          onClick={() => ok && score && onDone({ mood: { sleep: h, score: Number(score) as 1 | 2 | 3 | 4 | 5, note: note.trim() } })}
          className={primary}
        >
          {ok && score ? "Next: reaction" : "Enter sleep and mood"}
        </button>
      </Bottom>
    </>
  );
}

const TRIALS = 10;

function React10({ onDone }: { onDone: (p: Part) => void }) {
  type St = "ready" | "wait" | "go" | "early" | "done";
  const [st, setSt] = useState<St>("ready");
  const [ms, setMs] = useState<number[]>([]);
  const t = useRef<{ timer?: ReturnType<typeof setTimeout>; at: number }>({ at: 0 });
  useCues("rx_intro");

  const arm = useCallback(() => {
    clearTimeout(t.current.timer);
    setSt("wait");
    t.current.timer = setTimeout(() => {
      t.current.at = performance.now();
      setSt("go");
    }, 1500 + Math.random() * 2500);
  }, []);

  useEffect(() => {
    const r = t.current;
    return () => clearTimeout(r.timer);
  }, []);

  function tap() {
    if (st === "wait") {
      clearTimeout(t.current.timer);
      setSt("early");
      return;
    }
    if (st !== "go") return;
    const all = [...ms, Math.round(performance.now() - t.current.at)];
    setMs(all);
    if (all.length >= TRIALS) setSt("done");
    else arm();
  }

  const pad =
    st === "go"
      ? "bg-accent text-on-accent"
      : st === "early"
        ? "bg-panel text-alert border-alert/60"
        : "bg-panel text-dim";

  return (
    <>
      <section className="flex flex-1 flex-col gap-4">
        {st === "ready" && <Cue id="rx_intro" big />}
        {(st === "wait" || st === "go" || st === "early") && (
          <>
            <p className="text-dim" aria-live="polite">
              Tap {Math.min(ms.length + 1, TRIALS)} of {TRIALS}
            </p>
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                tap();
              }}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  if (!e.repeat) tap();
                }
              }}
              className={`flex min-h-[45vh] w-full touch-manipulation items-center justify-center rounded-2xl border border-edge text-3xl font-bold select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pad}`}
            >
              {st === "go" ? "Tap now" : st === "early" ? "Too soon" : "Wait for the flash"}
            </button>
          </>
        )}
        {st === "done" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-dim">Median of {TRIALS} taps</p>
            <p className="font-mono text-[4.5rem] leading-none font-bold tabular-nums">
              {Math.round(median(ms))}
              <span className="ml-2 text-2xl font-normal text-dim">ms</span>
            </p>
          </div>
        )}
      </section>
      <Bottom>
        {st === "ready" && (
          <button type="button" onClick={arm} className={primary}>
            Start: 10 taps
          </button>
        )}
        {st === "early" && (
          <button type="button" onClick={arm} className={primary}>
            Try that tap again
          </button>
        )}
        {st === "done" && (
          <button type="button" onClick={() => onDone({ rx: { ms } })} className={primary}>
            Finish and save
          </button>
        )}
      </Bottom>
    </>
  );
}
