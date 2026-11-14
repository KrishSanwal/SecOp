"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTIONS, RULE } from "@/lib/actions";
import { examsOf, exportJson, getCrew, getExam } from "@/lib/db";
import { insights } from "@/lib/insights";
import { say } from "@/lib/say";
import { LIMITS, report } from "@/lib/scoring";
import type { Crew, Flag, Report, Results, Sway } from "@/lib/types";
import { Bottom, ghost, primary } from "./ui";

const SWAY: Record<Sway, string> = { none: "No sway", mild: "Mild sway", marked: "Marked sway", out: "Stepped out" };
const SWAYS: Sway[] = ["none", "mild", "marked", "out"];

const sign = (v: number, d = 0) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(d)}`;
const pace = (f: number) => {
  const p = Math.round(Math.abs(f) * 100);
  return p === 0 ? "same speed" : `${p}% ${f > 0 ? "slower" : "faster"}`;
};

type Data = { r: Report; s?: Crew; x?: Crew; k: number; tips: string[] };

export default function Result() {
  const id = useSearchParams().get("id") ?? "";
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const bad = id ? err : "No exam was chosen.";

  useEffect(() => {
    if (!id) return;
    (async () => {
      const e = await getExam(id);
      if (!e) return setErr("This exam is not on this device.");
      const [hist, s, x] = await Promise.all([examsOf(e.subj), getCrew(e.subj), getCrew(e.exr)]);
      const upto = hist.filter((h) => h.at <= e.at);
      setD({ r: report(e, hist), s, x, k: hist.findIndex((h) => h.id === e.id) + 1, tips: insights(upto) });
    })().catch(() => setErr("Could not open exam records."));
  }, [id]);

  const n = d?.r.flags.length;
  useEffect(() => {
    if (n !== undefined) say(n ? "flag" : "clear");
  }, [n]);

  if (bad) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">No result to show</h1>
        <p role="alert" className="text-lg text-alert">
          {bad}
        </p>
        <Link href="/" className={ghost}>
          Back to crew
        </Link>
      </div>
    );
  }
  if (!d) return <p className="text-dim">Loading result…</p>;

  const { r, s, x, k, tips } = d;
  const fin = (v?: number | null) => typeof v === "number" && Number.isFinite(v);
  const sp = !!r.exam.res.space;
  const sn = s?.name ?? "Unknown";
  const xn = x?.name ?? "Unknown";
  const when = new Date(r.exam.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const hit = (stn: keyof Results) => r.flags.some((f) => f.stn === stn);

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="text-[2.5rem] leading-[1.15] font-bold tracking-tight text-balance">
          {n ? `${n} ${n === 1 ? "result needs" : "results need"} attention` : "All clear today"}
        </h1>
        <p className="text-lg text-dim">
          {sn}, examined by {xn} on {when}.
        </p>
      </header>

      {n ? (
        <section className="flex flex-col gap-4" aria-labelledby="todo">
          <h2 id="todo" className="text-xl font-semibold">
            What to do
          </h2>
          <p className="text-dim">{RULE}</p>
          {r.flags.map((f) => (
            <Card key={f.id} f={f} />
          ))}
        </section>
      ) : (
        <p className="text-lg">Every station is inside {sn}&apos;s usual range and the fixed limits. Swap roles and examine {xn} next.</p>
      )}

      {tips.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="noticed">
          <h2 id="noticed" className="text-xl font-semibold">
            What we noticed
          </h2>
          <ul className="flex flex-col gap-2">
            {tips.map((t) => (
              <li key={t} className="border-l-2 border-accent pl-3">
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="all">
        <h2 id="all" className="text-xl font-semibold">
          {sp ? "Stations (in space)" : "All five stations"}
        </h2>
        {!r.base && (
          <p className="text-dim">
            This is exam {k} for {sn}. Their usual range forms after {LIMITS.baseN} exams, so changes from usual show from exam {LIMITS.baseN + 1}.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-rule border-y border-rule">
          <Row name="Pupils" flag={hit("pupils")} today={`Left ${r.exam.res.pupils.l}, right ${r.exam.res.pupils.r}`} usual={r.base && (r.base.pupil === 0 ? "both brisk" : `${r.base.pupil.toFixed(1)} of 4 points`)} />
          {sp ? (
            <Row name="Heart rate and balance" flag={false} today="Skipped: they need gravity" />
          ) : (
            <>
              <Row
                name="Heart rate"
                flag={hit("hr")}
                today={`Rose ${Math.round(r.m.hr)} bpm on standing`}
                more={`${Math.round(r.exam.res.hr.sit * 4)} sitting, ${Math.round(r.exam.res.hr.stand * 4)} standing`}
                usual={r.base && fin(r.base.hr) ? `rose ${Math.round(r.base.hr)} bpm` : null}
                change={r.delta && fin(r.delta.hr) ? `${sign(r.delta.hr)} bpm` : null}
              />
              <Row
                name="Balance"
                flag={hit("bal")}
                today={r.exam.res.bal.sway === "out" ? `Stepped out at ${r.exam.res.bal.secs} s` : SWAY[r.exam.res.bal.sway]}
                usual={r.base && fin(r.base.bal) ? SWAY[SWAYS[Math.round(r.base.bal)]].toLowerCase() : null}
              />
            </>
          )}
          <Row
            name="Sleep and mood"
            flag={hit("mood")}
            today={`${r.exam.res.mood.sleep} h sleep, mood ${r.exam.res.mood.score} of 5`}
            more={r.exam.res.mood.note && `Said: “${r.exam.res.mood.note}”`}
            usual={r.base && `${r.base.sleep.toFixed(1)} h, mood ${r.base.mood.toFixed(1)}`}
            change={r.delta && `${sign(r.delta.sleep, 1)} h, mood ${sign(r.delta.mood, 1)}`}
          />
          <Row
            name="Reaction"
            flag={hit("rx")}
            today={`${Math.round(r.m.rx)} ms median`}
            usual={r.base && `${Math.round(r.base.rx)} ms`}
            change={r.base && pace(r.m.rx / r.base.rx - 1)}
          />
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link href={{ pathname: "/trend", query: { crew: r.exam.subj } }} className={ghost}>
          {sn}&apos;s trends
        </Link>
        <button type="button" onClick={() => exportJson()} className={ghost}>
          Export data
        </button>
      </div>
      <Link href="/" className="w-fit text-dim hover:text-ink">
        ← Back to crew
      </Link>

      <p className="text-sm text-dim">Prototype. Not a medical device. Records stay on this device.</p>

      <Bottom>
        <Link href={{ pathname: "/exam", query: { subj: r.exam.exr, exr: r.exam.subj } }} className={primary}>
          Swap roles: {sn} examines {xn}
        </Link>
      </Bottom>
    </>
  );
}

function Card({ f }: { f: Flag }) {
  const a = ACTIONS[f.id];
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-alert/50 bg-panel p-5">
      <h3 className="flex items-start gap-3 text-lg leading-snug font-semibold">
        <svg viewBox="0 0 24 24" className="mt-0.5 size-5 shrink-0 text-alert" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3 2 20h20L12 3ZM12 10v4M12 17.5v.01" />
        </svg>
        {f.msg}
      </h3>
      <div>
        <p className="font-semibold">Do now</p>
        <p className="text-lg leading-relaxed">{a.now}</p>
      </div>
      <div>
        <p className="font-semibold">Contact the flight surgeon</p>
        <p className="text-lg leading-relaxed">{a.call}</p>
      </div>
      <p className="text-sm text-dim">Source: {a.src}</p>
    </article>
  );
}

function Row(p: { name: string; flag: boolean; today: string; more?: string | false; usual?: string | null; change?: string | null }) {
  return (
    <li className="flex flex-col gap-1 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{p.name}</h3>
        {p.flag && <span className="text-sm font-semibold text-alert">Needs attention</span>}
      </div>
      <p className="text-xl">{p.today}</p>
      {p.more && <p className="text-dim">{p.more}</p>}
      {p.usual && (
        <p className="text-dim">
          Usual: {p.usual}
          {p.change && `. Change: ${p.change}`}
        </p>
      )}
    </li>
  );
}
