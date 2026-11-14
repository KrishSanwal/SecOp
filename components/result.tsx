"use client";

import { DownloadSimple, Eye, Heartbeat, Lightning, MoonStars, PersonSimple, Warning, type Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ACTIONS, RULE } from "@/lib/actions";
import { examsOf, exportJson, getCrew, getExam } from "@/lib/db";
import { say } from "@/lib/say";
import { LIMITS, report } from "@/lib/scoring";
import type { Crew, Flag, Report, Results, Sway } from "@/lib/types";
import { Back, Bottom, ghost, primary, Tag } from "./ui";

const SWAY: Record<Sway, string> = { none: "No sway", mild: "Mild sway", marked: "Marked sway", out: "Stepped out" };
const SWAYS: Sway[] = ["none", "mild", "marked", "out"];

const ok = (v: number | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const sign = (v: number, d = 0) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(d)}`;
const pct = (f: number, up: string, down: string, same: string) => {
  const p = Math.round(Math.abs(f) * 100);
  return p === 0 ? same : `${p}% ${f > 0 ? up : down}`;
};

type Data = { r: Report; s?: Crew; x?: Crew; k: number };

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
      setD({ r: report(e, hist), s, x, k: hist.findIndex((h) => h.id === e.id) + 1 });
    })().catch(() => setErr("Could not open exam records."));
  }, [id]);

  const n = d?.r.flags.length;
  useEffect(() => {
    if (n !== undefined) say(n ? "flag" : "clear");
  }, [n]);

  if (bad) {
    return (
      <div className="flex flex-col items-start gap-4">
        <Back href="/" label="Crew" />
        <Tag tone="alert">no result</Tag>
        <h1 className="text-3xl font-bold">No result to show</h1>
        <p role="alert" className="text-lg text-alert">
          {bad}
        </p>
      </div>
    );
  }
  if (!d) return <p className="font-mono text-dim">Loading result…</p>;

  const { r, s, x, k } = d;
  const res = r.exam.res;
  const b = r.base;
  const sn = s?.name ?? "Unknown";
  const xn = x?.name ?? "Unknown";
  const when = new Date(r.exam.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const hit = (stn: keyof Results) => r.flags.some((f) => f.stn === stn);
  const away = !ok(res.hr.sit);

  const pupMore = ok(r.m.plat) ? `Camera: reacted in ${Math.round(r.m.plat)} ms, shrank ${Math.round(r.m.pcon * 100)}%${ok(res.pupils.asym) ? `, eyes ${Math.round(res.pupils.asym * 100)} pts apart` : ""}` : "";
  const pupUsual = b && (ok(b.plat) && ok(r.m.plat) ? `${Math.round(b.plat)} ms, shrank ${Math.round(b.pcon * 100)}%` : b.pupil === 0 ? "both brisk" : ok(b.pupil) ? `${b.pupil.toFixed(1)} of 4 points` : null);
  const pupChange = b && ok(b.plat) && ok(r.m.plat) ? `${sign(r.m.plat - b.plat)} ms to react` : null;

  const balCam = ok(r.m.brms);
  const balToday = res.bal.sway === "out" ? `Stepped out at ${res.bal.secs} s` : balCam ? `Sway ${r.m.brms.toFixed(2)} m/s²` : SWAY[res.bal.sway];
  const balUsual = b && (balCam && ok(b.brms) ? `${b.brms.toFixed(2)} m/s²` : ok(b.bal) ? SWAY[SWAYS[Math.round(b.bal)]].toLowerCase() : null);
  const balChange = b && balCam && ok(b.brms) ? pct(r.m.brms / b.brms - 1, "more sway", "less sway", "same sway") : null;

  return (
    <>
      <Back href="/" label="Crew" />
      <header className="flex flex-col gap-3">
        <Tag tone={n ? "alert" : "accent"}>result ✱ {when}</Tag>
        <h1 className="text-[2.75rem] leading-[1.05] font-bold text-balance uppercase">
          {n ? `${n} ${n === 1 ? "result needs" : "results need"} attention` : "All clear today"}
        </h1>
        <p className="text-lg text-dim">
          {sn}, examined by {xn}.{away && " In transit: heart rate and balance were skipped."}
        </p>
      </header>

      {n ? (
        <section className="flex flex-col gap-4" aria-labelledby="todo">
          <h2 id="todo" className="font-mono text-xs font-normal tracking-[0.14em] text-alert uppercase">
            <span aria-hidden>{"// "}</span>what to do
          </h2>
          <p className="text-dim">{RULE}</p>
          {r.flags.map((f) => (
            <Card key={f.id} f={f} />
          ))}
        </section>
      ) : (
        <p className="text-lg">Every station is inside {sn}&apos;s usual range and the fixed limits. Swap roles and examine {xn} next.</p>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="all">
        <h2 id="all" className="font-mono text-xs font-normal tracking-[0.14em] text-accent uppercase">
          <span aria-hidden>{"// "}</span>all stations
        </h2>
        {!b && (
          <p className="text-dim">
            This is exam {k} for {sn}. Their usual range forms after {LIMITS.baseN} exams, so changes from usual show from exam {LIMITS.baseN + 1}.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-rule border-y border-rule">
          <Row I={Eye} name="Pupils" flag={hit("pupils")} today={`Left ${res.pupils.l}, right ${res.pupils.r}`} more={pupMore} usual={pupUsual} change={pupChange} />
          {away ? (
            <Row I={Heartbeat} name="Heart rate" flag={false} today="Skipped: in transit" more="Needs gravity" />
          ) : (
            <Row
              I={Heartbeat}
              name="Heart rate"
              flag={hit("hr")}
              today={`Rose ${Math.round(r.m.hr)} bpm on standing`}
              more={`${Math.round(res.hr.sit * 4)} sitting, ${Math.round(res.hr.stand * 4)} standing, ${res.hr.cam ? "by camera" : "counted by hand"}`}
              usual={b && ok(b.hr) ? `rose ${Math.round(b.hr)} bpm` : null}
              change={r.delta && ok(r.delta.hr) ? `${sign(r.delta.hr)} bpm` : null}
            />
          )}
          {away ? (
            <Row I={PersonSimple} name="Balance" flag={false} today="Skipped: in transit" more="Needs gravity" />
          ) : (
            <Row I={PersonSimple} name="Balance" flag={hit("bal")} today={balToday} more={balCam && res.bal.sway !== "out" ? `Held ${res.bal.secs} s, motion sensor` : ""} usual={balUsual} change={balChange} />
          )}
          <Row
            I={MoonStars}
            name="Sleep and mood"
            flag={hit("mood")}
            today={`${res.mood.sleep} h sleep, mood ${res.mood.score} of 5`}
            more={res.mood.note && `Said: “${res.mood.note}”`}
            usual={b && `${b.sleep.toFixed(1)} h, mood ${b.mood.toFixed(1)}`}
            change={r.delta && `${sign(r.delta.sleep, 1)} h, mood ${sign(r.delta.mood, 1)}`}
          />
          <Row
            I={Lightning}
            name="Reaction"
            flag={hit("rx")}
            today={`${Math.round(r.m.rx)} ms median`}
            usual={b && `${Math.round(b.rx)} ms`}
            change={b && pct(r.m.rx / b.rx - 1, "slower", "faster", "same speed")}
          />
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/" className={ghost}>
          Back to crew
        </Link>
        <button type="button" onClick={() => exportJson()} className={ghost}>
          <DownloadSimple size={20} weight="bold" aria-hidden />
          Export data
        </button>
      </div>

      <p className="font-mono text-xs text-dim">Prototype. Not a medical device. Records stay on this device.</p>

      <Bottom>
        <Link href={{ pathname: "/exam", query: { subj: r.exam.exr, exr: r.exam.subj } }} className={primary}>
          Swap roles: {sn.split(" ")[0]} examines {xn.split(" ")[0]}
        </Link>
      </Bottom>
    </>
  );
}

function Card({ f }: { f: Flag }) {
  const a = ACTIONS[f.id];
  return (
    <article className="hud flex flex-col gap-4 bg-panel p-5 [--c:var(--alert)]">
      <h3 className="flex items-start gap-3 text-xl leading-snug font-semibold">
        <Warning size={24} weight="bold" className="mt-0.5 shrink-0 text-alert" aria-hidden />
        {f.msg}
      </h3>
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-dim uppercase">Do now</p>
        <p className="mt-1 text-lg leading-relaxed">{a.now}</p>
      </div>
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-dim uppercase">Contact the flight surgeon</p>
        <p className="mt-1 text-lg leading-relaxed">{a.call}</p>
      </div>
      <p className="text-sm text-dim">Source: {a.src}</p>
    </article>
  );
}

function Row(p: { I: Icon; name: string; flag: boolean; today: string; more?: string | false; usual?: string | null; change?: string | null }) {
  return (
    <li className="flex flex-col gap-1 py-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <p.I size={20} weight="bold" className={p.flag ? "text-alert" : "text-dim"} aria-hidden />
          {p.name}
        </h3>
        {p.flag && <span className="font-mono text-xs tracking-[0.14em] text-alert uppercase">Needs attention</span>}
      </div>
      <p className="text-xl text-chalk">{p.today}</p>
      {p.more && <p className="text-dim">{p.more}</p>}
      {p.usual && (
        <p className="font-mono text-sm text-dim">
          Usual: {p.usual}
          {p.change && `. Change: ${p.change}`}
        </p>
      )}
    </li>
  );
}
