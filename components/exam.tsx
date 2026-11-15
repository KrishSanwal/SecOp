"use client";

import { Eye, Heartbeat, Lightning, MoonStars, PersonSimple, SpeakerHigh, SpeakerSlash, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCrew, putExam, uid } from "@/lib/db";
import type { PromptId } from "@/lib/prompts";
import { hush, say } from "@/lib/say";
import { LIMITS, median } from "@/lib/scoring";
import { askMotion } from "@/lib/sway";
import type { Crew, Pupil, Results, Sway } from "@/lib/types";
import { Prep, Verdict, type Tone } from "./lab";
import { CamHr, CamPupil, MotionBal, type EyeRead } from "./sense";
import { ReflexGraph } from "./reflex";
import { examsOf } from "@/lib/db";
import { Back, Bottom, btn, Choice, Cue, ghost, primary, Stepper, Tag, Talk, Timed, useCues } from "./ui";

type Key = "pupils" | "hr" | "bal" | "mood" | "rx";
type Part = Partial<Results>;
type Step = { onDone: (p: Part) => void; next: string };

const ALL: { k: Key; t: string; h: string; I: Icon }[] = [
  { k: "pupils", t: "Pupils", h: "Light reaction in each eye", I: Eye },
  { k: "hr", t: "Heart rate", h: "Fingertip on the back camera", I: Heartbeat },
  { k: "bal", t: "Balance", h: "Phone on chest, eyes closed", I: PersonSimple },
  { k: "mood", t: "Sleep and mood", h: "Three questions", I: MoonStars },
  { k: "rx", t: "Reaction", h: "Ten taps", I: Lightning },
];

const NOTE = "A rough guide, not a diagnosis. The result card compares this with their usual.";
const WHERE = "so-where";

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
  const [where, setWhere] = useState<"surface" | "space">(() => {
    try {
      return localStorage.getItem(WHERE) === "space" ? "space" : "surface";
    } catch {
      return "surface";
    }
  });
  const ok = sid && xid && sid !== xid;
  const bad = ok ? err : "Pick two different crew members first.";
  const list = where === "space" ? ALL.filter((s) => s.k !== "hr" && s.k !== "bal") : ALL;

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

  function pick(w: "surface" | "space") {
    setWhere(w);
    try {
      localStorage.setItem(WHERE, w);
    } catch {}
  }

  function back() {
    hush();
    setLeave(false);
    if (n > 0) setN(n - 1);
    else setLeave(true);
  }

  async function next(p: Part) {
    const all = { ...res, ...p };
    setRes(all);
    if (n < list.length - 1) return setN(n + 1);
    if (where === "space") {
      all.hr = { sit: NaN, stand: NaN };
      all.bal = { sway: "none", secs: 0 };
      all.space = true;
    }
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
        <Back href="/" label="Crew" />
        <h1 className="text-3xl font-bold">Can&apos;t start the exam</h1>
        <p role="alert" className="text-lg text-alert">
          {bad}
        </p>
      </div>
    );
  }
  if (!pair) return <p className="font-mono text-dim">Loading exam…</p>;
  const [s, x] = pair;

  if (saved) {
    return (
      <>
        <Back href="/" label="Crew" />
        <section className="flex flex-col items-start gap-4">
          <h1 className="text-[2.75rem] leading-[1.05] font-bold">Exam complete</h1>
          <p className="text-lg text-dim">Saved on this device. Swap roles when you are ready.</p>
        </section>
        <Bottom>
          <Link href={{ pathname: "/result", query: { id: saved } }} className={primary}>
            Show results
          </Link>
        </Bottom>
      </>
    );
  }

  const st = list[n];
  const nx = n < list.length - 1 ? `Continue to ${list[n + 1].t.toLowerCase()}` : "Finish and save";

  return (
    <Talk.Provider value={talk}>
      <div className="flex items-center justify-between gap-2">
        {n < 0 ? <Back href="/" label="Crew" /> : <Back onClick={back} label={n === 0 ? "Leave" : "Back"} />}
        <button type="button" aria-pressed={!voice} onClick={mute} className={`${btn} -mr-3 px-3 text-dim hover:text-accent`}>
          {voice ? <SpeakerHigh size={20} weight="bold" aria-hidden /> : <SpeakerSlash size={20} weight="bold" aria-hidden />}
          {voice ? "Mute voice" : "Unmute voice"}
        </button>
      </div>

      {leave && (
        <div role="alertdialog" aria-label="Leave the exam?" className="flex flex-col gap-3 border-l-4 border-alert bg-panel p-4">
          <p className="font-semibold text-chalk">Leave the exam? Nothing is saved yet.</p>
          <div className="flex gap-2">
            <Link href="/" className={`${ghost} flex-1 border-alert text-alert hover:border-alert hover:text-alert`}>
              Leave, discard
            </Link>
            <button type="button" onClick={() => setLeave(false)} className={`${ghost} flex-1`}>
              Stay
            </button>
          </div>
        </div>
      )}

      {n < 0 ? (
        <Intro s={s} x={x} list={list} where={where} onWhere={pick} onGo={() => setN(0)} />
      ) : (
        <>
          <header className="flex flex-col gap-3">
            <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${list.length}, 1fr)` }} aria-label="Stations">
              {list.map((t, i) => (
                <li key={t.k} aria-current={i === n ? "step" : undefined} className={`h-1.5 ${i < n ? "bg-accent" : i === n ? "bg-accent shadow-[0_0_10px_rgb(242_255_61/0.7)]" : "bg-rule"}`}>
                  <span className="sr-only">
                    {t.t}
                    {i < n ? ", done" : ""}
                  </span>
                </li>
              ))}
            </ol>
            <Tag tone="accent">
              station {n + 1} of {list.length}
            </Tag>
            <h1 className="flex items-center gap-3 text-[2.5rem] leading-none font-bold">
              <st.I size={36} weight="bold" className="shrink-0 text-accent" aria-hidden />
              {st.t}
            </h1>
            <p className="text-dim">
              {x.name} examines {s.name}.
            </p>
          </header>
          {st.k === "pupils" && <Pupils key={`p${n}`} onDone={next} next={nx} />}
          {st.k === "hr" && <Heart key={`h${n}`} onDone={next} next={nx} />}
          {st.k === "bal" && <Balance key={`b${n}`} onDone={next} next={nx} />}
          {st.k === "mood" && <Mood key={`m${n}`} onDone={next} next={nx} />}
          {st.k === "rx" && <React10 key={`r${n}`} onDone={next} next={nx} />}
        </>
      )}
    </Talk.Provider>
  );
}

function Intro(p: { s: Crew; x: Crew; list: typeof ALL; where: "surface" | "space"; onWhere: (w: "surface" | "space") => void; onGo: () => void }) {
  useCues("start");
  return (
    <>
      <section className="flex flex-col gap-6">
        <h1 className="text-[2.75rem] leading-[1.15] font-bold text-balance">
          <span className="border-b-4 border-accent">{p.x.name}</span> <span className="font-medium text-dim">examines</span>{" "}
          <span className="border-b-4 border-accent">{p.s.name}</span>
        </h1>
        <Cue id="start" />
        <Choice
          name="where"
          legend="Where is the crew?"
          cols="grid-cols-2"
          value={p.where}
          onChange={p.onWhere}
          opts={[
            ["surface", "On a surface", "Moon, Mars, or after landing"],
            ["space", "In space", "No gravity: skips heart and balance"],
          ]}
        />
        <ol className="flex flex-col divide-y divide-rule border-y border-rule">
          {p.list.map((t, i) => (
            <li key={t.k} className="flex items-center gap-4 py-3">
              <span className="w-7 font-mono text-sm text-accent">{i + 1}</span>
              <t.I size={22} weight="bold" className="shrink-0 text-dim" aria-hidden />
              <span className="font-semibold text-chalk">{t.t}</span>
              <span className="ml-auto text-right text-sm text-dim">{t.h}</span>
            </li>
          ))}
        </ol>
      </section>
      <Bottom>
        <button type="button" onClick={p.onGo} className={primary}>
          Begin station 1
        </button>
      </Bottom>
    </>
  );
}

function Done({ next, onClick, disabled }: { next: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Bottom>
      <button type="button" onClick={onClick} disabled={disabled} className={primary}>
        {next}
      </button>
    </Bottom>
  );
}

const PREP = {
  pupils: ["Room lights on, no bright window behind the subject", "Subject's glasses off", "Examiner holds the phone at the subject's eye level", "Subject looks at something far away, eyes wide open"],
  hr: ["Subject sits and rests for a minute", "Arm resting on a table, hand relaxed", "Warm hands: rub them if they are cold", "Find the back camera and the flash next to it"],
  bal: ["Shoes off, on a flat floor", "Clear space; examiner within arm's reach", "Sound on: beeps say when to close and open eyes", "Phone flat on the middle of the chest, both hands", "Feet together, arms in, look straight ahead"],
  rx: ["Subject sits", "Phone flat on a table in front of them", "No distractions; everyone else quiet"],
};

function Pupils({ onDone, next }: Step) {
  const [step, setStep] = useState<"prep" | "cam" | "left" | "right" | "rate" | "verdict">("prep");
  const [l, setL] = useState<Pupil | null>(null);
  const [r, setR] = useState<Pupil | null>(null);
  const [cam, setCam] = useState<{ r: EyeRead; l: EyeRead } | null>(null);
  const subj = useSearchParams().get("subj") ?? "";
  const [prev, setPrev] = useState<number[] | null>(null);
  useEffect(() => {
    if (!subj) return;
    examsOf(subj)
      .then((xs) => setPrev([...xs].reverse().find((e) => e.res.pupils.curve?.some(Number.isFinite))?.res.pupils.curve ?? null))
      .catch(() => {});
  }, [subj]);
  const meanCurve = (c: { r: EyeRead; l: EyeRead }) => {
    const ok = [c.r, c.l].filter((e) => e.ok && e.curve?.length);
    if (!ok.length) return undefined;
    return ok[0].curve.map((_, i) => {
      const v = ok.map((e) => e.curve[i]).filter(Number.isFinite);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
    });
  };
  const talk = useContext(Talk);
  const opts: [Pupil, string, string][] = [
    ["brisk", "Brisk", "shrinks fast"],
    ["sluggish", "Sluggish", "shrinks slowly"],
    ["unequal", "Unequal", "size differs"],
  ];
  const go = (s: typeof step, id?: PromptId) => {
    setStep(s);
    if (id) talk(id);
  };
  const hand = async () => {
    setCam(null);
    setStep("left");
    if (await talk("pupil_intro")) talk("pupil_left");
  };
  const start = () => setStep("cam");
  // Camera: brisk if it shrank 12%+ within 500 ms; unequal if the eyes differ by 10 points.
  const rate = (e: EyeRead): Pupil => (e.ok && e.con >= 0.12 && e.lat <= 500 ? "brisk" : "sluggish");
  const got = (c: { r: EyeRead; l: EyeRead }) => {
    const asym = c.r.ok && c.l.ok ? Math.abs(c.r.con - c.l.con) : NaN;
    const uneq = asym > 0.1;
    setCam(c);
    setR(uneq && c.r.con < c.l.con ? "unequal" : rate(c.r));
    setL(uneq && c.l.con <= c.r.con ? "unequal" : rate(c.l));
    setStep("verdict");
  };
  const okEyes = cam ? [cam.r, cam.l].filter((e) => e.ok) : [];
  const avg = (k: "con" | "lat") => (okEyes.length ? okEyes.reduce((a, e) => a + e[k], 0) / okEyes.length : undefined);
  const pct = (e?: EyeRead) => (e?.ok ? `${Math.round(e.con * 100)}% in ${Math.round(e.lat)} ms` : "not measured");
  const fine = l === "brisk" && r === "brisk";

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "prep" && <Prep items={PREP.pupils} onAll={start} />}
        {step === "cam" && <CamPupil onRead={got} onHand={hand} />}
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
        {step === "verdict" && (
          <Verdict
            tone={fine ? "ok" : "check"}
            title={fine ? "Looks normal" : "Worth a recheck"}
            body={fine ? "Both pupils shrank briskly in the light." : "One or both pupils were slow or unequal. Recheck in dim light; the result card has what to do."}
            nums={
              cam
                ? [
                    ["Right eye", pct(cam.r)],
                    ["Left eye", pct(cam.l)],
                  ]
                : [
                    ["Left eye", l ?? "–"],
                    ["Right eye", r ?? "–"],
                  ]
            }
            again={() => {
              setL(null);
              setR(null);
              if (cam) setStep("cam");
              else go("left", "pupil_left");
            }}
            note={NOTE}
          >
            {cam && meanCurve(cam) && <ReflexGraph now={meanCurve(cam)!} prev={prev} />}
          </Verdict>
        )}
      </section>
      {step === "left" && (
        <Bottom>
          <button type="button" onClick={() => go("right", "pupil_right")} className={primary}>
            Check the right eye
          </button>
        </Bottom>
      )}
      {step === "right" && (
        <Bottom>
          <button type="button" onClick={() => go("rate", "pupil_rate")} className={primary}>
            Rate the pupils
          </button>
        </Bottom>
      )}
      {step === "rate" && (
        <Bottom>
          <button type="button" disabled={!l || !r} onClick={() => setStep("verdict")} className={primary}>
            {l && r ? "Save the rating" : "Rate both eyes"}
          </button>
        </Bottom>
      )}
      {step === "verdict" && l && r && (
        <Done
          next={next}
          onClick={() =>
            onDone({ pupils: cam ? { l, r, lat: avg("lat"), con: avg("con"), asym: cam.r.ok && cam.l.ok ? Math.abs(cam.r.con - cam.l.con) : undefined, curve: meanCurve(cam) } : { l, r } })
          }
        />
      )}
    </>
  );
}

type Read = { n: number; cam: boolean };

const okCount = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 5 && n <= 60;
};

function CamReading({ which, onRead, onHand }: { which: "sit" | "stand"; onRead: (r: Read) => void; onHand: () => void }) {
  useCues(which === "sit" ? "hr_cam" : "hr_cam_again");
  return <CamHr onRead={(bpm) => onRead({ n: bpm / 4, cam: true })} onHand={onHand} />;
}

function HandReading({ which, onRead }: { which: "sit" | "stand"; onRead: (r: Read) => void }) {
  const [st, setSt] = useState<"ready" | "count" | "enter">("ready");
  const [v, setV] = useState("");
  const word = which === "sit" ? "sitting" : "standing";
  return (
    <>
      <section className="flex flex-col gap-4">
        {st === "ready" && (which === "sit" ? <Cue id="hr_intro" big /> : <p className="font-display text-2xl font-semibold text-chalk">Find the pulse at the wrist again.</p>)}
        {st === "count" && <Timed cue={which === "sit" ? "hr_sit" : "hr_stand_go"} end="stop" secs={15} label={`Count the ${word} pulse`} onDone={() => setSt("enter")} />}
        {st === "enter" && (
          <>
            <Stepper id={which} label={`${which === "sit" ? "Sitting" : "Standing"} count`} hint="Beats counted in 15 seconds" value={v} onChange={setV} min={5} max={60} step={1} start={18} />
            <p className="text-dim" aria-live="polite">
              {okCount(v) ? `That is ${Number(v) * 4} beats per minute.` : v ? "Enter a count from 5 to 60." : ""}
            </p>
          </>
        )}
      </section>
      {st === "ready" && (
        <Bottom>
          <button type="button" onClick={() => setSt("count")} className={primary}>
            Start the 15-second count
          </button>
        </Bottom>
      )}
      {st === "enter" && (
        <Bottom>
          <button type="button" disabled={!okCount(v)} onClick={() => onRead({ n: Number(v), cam: false })} className={primary}>
            Save the {word} count
          </button>
        </Bottom>
      )}
    </>
  );
}

function Reading({ which, onRead }: { which: "sit" | "stand"; onRead: (r: Read) => void }) {
  const [hand, setHand] = useState(false);
  return hand ? <HandReading which={which} onRead={onRead} /> : <CamReading which={which} onRead={onRead} onHand={() => setHand(true)} />;
}

const bpm = (r: Read) => Math.round(r.n * 4);

function Heart({ onDone, next }: Step) {
  const [step, setStep] = useState<"prep" | "sit" | "up" | "wait" | "stand" | "verdict">("prep");
  const [sit, setSit] = useState<Read | null>(null);
  const [stand, setStand] = useState<Read | null>(null);
  const rise = sit && stand ? bpm(stand) - bpm(sit) : 0;
  const high = rise > LIMITS.hr;
  const how = sit && stand ? (sit.cam && stand.cam ? "Camera" : sit.cam || stand.cam ? "Camera and hand" : "Hand count") : "";

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "prep" && <Prep items={PREP.hr} onAll={() => setStep("sit")} />}
        {step === "sit" && (
          <Reading
            key="sit"
            which="sit"
            onRead={(r) => {
              setSit(r);
              setStep("up");
            }}
          />
        )}
        {step === "up" && sit && (
          <div className="flex flex-col gap-3">
            <p className="text-dim">Sitting</p>
            <p className="font-mono text-6xl font-bold text-chalk tabular-nums">
              {bpm(sit)}
              <span className="ml-2 text-xl font-normal text-dim">bpm</span>
            </p>
            <p className="font-display text-2xl font-semibold text-chalk">Subject stands up now. Then start the one-minute wait.</p>
          </div>
        )}
        {step === "wait" && <Timed key="wait" cue="hr_stand" secs={60} label="Standing still" onDone={() => setStep("stand")} skip />}
        {step === "stand" && (
          <Reading
            key="stand"
            which="stand"
            onRead={(r) => {
              setStand(r);
              setStep("verdict");
            }}
          />
        )}
        {step === "verdict" && sit && stand && (
          <Verdict
            tone={high ? "check" : "ok"}
            title={high ? "Worth a recheck" : "Looks normal"}
            body={
              high
                ? `Heart rate rose ${rise} bpm on standing, more than ${LIMITS.hr}. Sit them down if they feel dizzy; the result card has what to do.`
                : `Heart rate rose ${rise} bpm on standing. Up to ${LIMITS.hr} is expected.`
            }
            nums={[
              ["Sitting", `${bpm(sit)} bpm`],
              ["Standing", `${bpm(stand)} bpm`],
              ["Measured by", how],
            ]}
            again={() => {
              setSit(null);
              setStand(null);
              setStep("sit");
            }}
            note={NOTE}
          />
        )}
      </section>
      {step === "up" && (
        <Bottom>
          <button type="button" onClick={() => setStep("wait")} className={primary}>
            Subject is standing
          </button>
        </Bottom>
      )}
      {step === "verdict" && sit && stand && <Done next={next} onClick={() => onDone({ hr: { sit: sit.n, stand: stand.n, cam: sit.cam && stand.cam } })} />}
    </>
  );
}

type Bal = { sway: Sway; secs: number; rms?: number };

function CamBalance({ onRead, onHand }: { onRead: (b: Bal) => void; onHand: () => void }) {
  useCues("bal_cam");
  return <MotionBal onRead={(r) => onRead({ sway: r.out ? "out" : "none", secs: r.out ? r.secs : 30, rms: r.rms })} onHand={onHand} />;
}

function HandBalance({ onRead }: { onRead: (b: Bal) => void }) {
  const [step, setStep] = useState<"ready" | "go" | "rate">("ready");
  const [sway, setSway] = useState<Sway | null>(null);
  const [secs, setSecs] = useState(30);
  const t0 = useRef(0);
  const talk = useContext(Talk);
  useCues("bal_intro");

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "ready" && (
          <>
            <Cue id="bal_intro" big />
            <p className="text-dim">Examiner holds the phone and watches.</p>
          </>
        )}
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
              className={`${btn} min-h-16 w-full border-2 border-alert text-lg text-alert hover:bg-alert/10`}
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
      {step === "ready" && (
        <Bottom>
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
        </Bottom>
      )}
      {step === "rate" && (
        <Bottom>
          <button type="button" disabled={!sway} onClick={() => sway && onRead({ sway, secs: sway === "out" ? secs : 30 })} className={primary}>
            Save the rating
          </button>
        </Bottom>
      )}
    </>
  );
}

const SWAY: Record<Sway, string> = { none: "None", mild: "Mild", marked: "Marked", out: "Stepped out" };

function Balance({ onDone, next }: Step) {
  const [step, setStep] = useState<"prep" | "cam" | "hand" | "verdict">("prep");
  const [why, setWhy] = useState("");
  const [b, setB] = useState<Bal | null>(null);
  const [src, setSrc] = useState<"cam" | "hand">("cam");
  const read = (s: "cam" | "hand") => (v: Bal) => {
    setB(v);
    setSrc(s);
    setStep("verdict");
  };

  async function start() {
    const ok = await askMotion();
    if (!ok) setWhy("This phone isn't sharing its motion sensor, so rate the sway by eye. On iPhone, allow Motion & Orientation when asked.");
    setStep(ok ? "cam" : "hand");
  }

  let tone: Tone = "ok";
  let title = "Looks normal";
  let body = "Held steady for the full 30 seconds with eyes closed.";
  if (b?.sway === "out") {
    tone = "check";
    title = "Worth a recheck";
    body = `Stepped out after ${b.secs} seconds. Sit them down; note any dizziness or spinning.`;
  } else if (b && (src === "cam" ? (b.rms ?? 0) >= 0.25 : b.sway === "marked")) {
    tone = "check";
    title = "Worth a recheck";
    body = "Stayed up but swayed more than a steady stance. The result card compares this with their usual.";
  }

  return (
    <>
      <section className="flex flex-col gap-6">
        {step === "prep" && <Prep items={PREP.bal} onAll={start} />}
        {step === "cam" && <CamBalance onRead={read("cam")} onHand={() => setStep("hand")} />}
        {step === "hand" && (
          <>
            {why && <p className="text-alert">{why}</p>}
            <HandBalance onRead={read("hand")} />
          </>
        )}
        {step === "verdict" && b && (
          <Verdict
            tone={tone}
            title={title}
            body={body}
            nums={
              src === "cam"
                ? [
                    ["Sway", `${(b.rms ?? NaN).toFixed(2)} m/s²`],
                    ["Held for", `${b.secs} s`],
                  ]
                : [
                    ["Rating", SWAY[b.sway]],
                    ["Held for", `${b.secs} s`],
                  ]
            }
            again={() => {
              setB(null);
              setStep(src);
            }}
            note={NOTE}
          />
        )}
      </section>
      {step === "verdict" && b && <Done next={next} onClick={() => onDone({ bal: b })} />}
    </>
  );
}

function Mood({ onDone, next }: Step) {
  const [step, setStep] = useState<"ask" | "verdict">("ask");
  const [sleep, setSleep] = useState("");
  const [score, setScore] = useState<"1" | "2" | "3" | "4" | "5" | null>(null);
  const [note, setNote] = useState("");
  useCues("mood_intro", "mood_sleep");
  const h = Number(sleep);
  const ok = sleep !== "" && Number.isFinite(h) && h >= 0 && h <= 24;
  const low = Number(score) <= LIMITS.mood;
  const short = h < LIMITS.sleep;

  return (
    <>
      <section className="flex flex-col gap-8">
        {step === "ask" && (
          <>
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
              <label htmlFor="note" className="text-lg font-semibold text-chalk">
                Their answer <span className="font-normal text-dim">(optional)</span>
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                rows={3}
                className="w-full rounded-[3px] border border-edge bg-panel p-4 text-lg focus:border-accent focus:outline-none"
              />
            </div>
          </>
        )}
        {step === "verdict" && (
          <Verdict
            tone={low || short ? "check" : "ok"}
            title={low ? "Worth a check-in" : short ? "Short sleep" : "Noted"}
            body={
              low
                ? "Mood is low today. Check in privately after the exam; the result card has what to do."
                : short
                  ? `Under ${LIMITS.sleep} hours of sleep. If it happens again next exam, the result card will flag it.`
                  : "Sleep and mood are recorded."
            }
            nums={[
              ["Sleep", `${h} h`],
              ["Mood", `${score} of 5`],
              ...(note.trim() ? [["Said", note.trim()] as [string, string]] : []),
            ]}
            again={() => setStep("ask")}
            againLabel="Change the answers"
            note={NOTE}
          />
        )}
      </section>
      {step === "ask" && (
        <Bottom>
          <button type="button" disabled={!ok || !score} onClick={() => setStep("verdict")} className={primary}>
            {ok && score ? "Save the answers" : "Enter sleep and mood"}
          </button>
        </Bottom>
      )}
      {step === "verdict" && ok && score && <Done next={next} onClick={() => onDone({ mood: { sleep: h, score: Number(score) as 1 | 2 | 3 | 4 | 5, note: note.trim() } })} />}
    </>
  );
}

const TRIALS = 10;

function React10({ onDone, next }: Step) {
  type St = "prep" | "ready" | "wait" | "go" | "early" | "verdict";
  const [st, setSt] = useState<St>("prep");
  const [ms, setMs] = useState<number[]>([]);
  const t = useRef<{ timer?: ReturnType<typeof setTimeout>; at: number }>({ at: 0 });
  const talk = useContext(Talk);

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
    if (all.length >= TRIALS) setSt("verdict");
    else arm();
  }

  const pad = st === "go" ? "bg-accent text-on-accent glow" : st === "early" ? "bg-panel text-alert border-alert" : "bg-panel text-dim";
  const sorted = [...ms].sort((a, b) => a - b);

  return (
    <>
      <section className="flex flex-1 flex-col gap-4">
        {st === "prep" && (
          <Prep
            items={PREP.rx}
            onAll={() => {
              setSt("ready");
              talk("rx_intro");
            }}
          />
        )}
        {st === "ready" && <Cue id="rx_intro" big />}
        {(st === "wait" || st === "go" || st === "early") && (
          <>
            <p className="font-mono text-sm text-dim" aria-live="polite">
              TAP {Math.min(ms.length + 1, TRIALS)} / {TRIALS}
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
              className={`cut flex min-h-[45vh] w-full touch-manipulation items-center justify-center border border-edge font-display text-4xl font-bold select-none ${pad}`}
            >
              {st === "go" ? "Tap now" : st === "early" ? "Too soon" : "Wait for the flash"}
            </button>
          </>
        )}
        {st === "verdict" && (
          <Verdict
            tone="ok"
            title={`Median ${Math.round(median(ms))} ms`}
            body="Ten taps recorded."
            nums={[
              ["Fastest", `${sorted[0]} ms`],
              ["Slowest", `${sorted.at(-1)} ms`],
            ]}
            again={() => {
              setMs([]);
              setSt("ready");
            }}
            note={NOTE}
          />
        )}
      </section>
      {st === "ready" && (
        <Bottom>
          <button type="button" onClick={arm} className={primary}>
            Start: 10 taps
          </button>
        </Bottom>
      )}
      {st === "early" && (
        <Bottom>
          <button type="button" onClick={arm} className={primary}>
            Try that tap again
          </button>
        </Bottom>
      )}
      {st === "verdict" && <Done next={next} onClick={() => onDone({ rx: { ms } })} />}
    </>
  );
}
