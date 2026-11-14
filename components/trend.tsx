"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { examsOf, getCrew } from "@/lib/db";
import { insights, META, series, type Point } from "@/lib/insights";
import { LIMITS } from "@/lib/scoring";
import type { Crew, Exam } from "@/lib/types";
import { Back, ghost } from "./ui";

export default function Trend() {
  const id = useSearchParams().get("crew");
  const [d, setD] = useState<{ c?: Crew; hist: Exam[] } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([getCrew(id), examsOf(id)])
      .then(([c, hist]) => setD({ c, hist }))
      .catch(() => setErr("Could not open records."));
  }, [id]);

  const fail = id ? err : "No crew member selected.";
  if (fail) return <p role="alert" className="text-alert">{fail}</p>;
  if (!d) return <p className="text-dim">Loading…</p>;

  const name = d.c?.name ?? "Unknown";
  const s = series(d.hist);
  const tips = insights(d.hist, 5);
  const shown = META.filter((m) => s[m.k].length >= 1);

  return (
    <>
      <header className="flex flex-col gap-2">
        <Back href="/" label="Crew" />
        <h1 className="text-[2.5rem] leading-[1.05] font-bold">{name} over time</h1>
        <p className="text-dim">
          {d.hist.length} {d.hist.length === 1 ? "exam" : "exams"}. The shaded line is {name}&apos;s usual, from the first {LIMITS.baseN}.
        </p>
      </header>

      {tips.length > 0 && (
        <section className="flex flex-col gap-2" aria-labelledby="noticed">
          <h2 id="noticed" className="text-xl font-semibold">
            What we noticed
          </h2>
          <ul className="flex flex-col gap-2">
            {tips.map((t) => (
              <li key={t} className="rounded-lg bg-panel px-3 py-2 text-lg">{t}</li>
            ))}
          </ul>
        </section>
      )}

      {d.hist.length < 2 && <p className="text-dim">Trends appear after two exams.</p>}

      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {shown.map((m) => {
          const p = s[m.k];
          const last = p.at(-1)!;
          const base = p.length >= LIMITS.baseN ? p.slice(0, LIMITS.baseN).reduce((a, x) => a + x.v, 0) / LIMITS.baseN : null;
          return (
            <li key={m.k} className="flex flex-col gap-2 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-chalk">{m.t}</span>
                <span className="font-mono text-chalk tabular-nums">{m.fmt(last.v)}</span>
              </div>
              {p.length >= 2 && <Spark p={p} base={base} worse={m.worse} />}
              <p className="font-mono text-sm text-dim">
                {base != null ? `Usual ${m.fmt(base)}` : "No usual yet"}. {m.worse > 0 ? "Lower is better" : "Higher is better"}
              </p>
            </li>
          );
        })}
      </ul>

      <Link href="/" className={ghost}>Back to crew</Link>
    </>
  );
}

function Spark({ p, base, worse }: { p: Point[]; base: number | null; worse: 1 | -1 }) {
  const W = 320, H = 64, pad = 6;
  const vs = p.map((x) => x.v).concat(base ?? []);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const x = (i: number) => pad + (i / Math.max(1, p.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo)) * (H - 2 * pad);
  const path = p.map((pt, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(" ");
  const bad = (v: number) => base != null && (v - base) * worse > Math.abs(base) * 0.2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" role="img" aria-label="Trend">
      {base != null && <line x1={pad} x2={W - pad} y1={y(base)} y2={y(base)} stroke="var(--edge)" strokeWidth="6" strokeLinecap="round" opacity="0.5" />}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" style={{ filter: "drop-shadow(0 0 4px rgb(242 255 61 / 0.6))" }} />
      {p.map((pt, i) => (
        <circle key={i} cx={x(i)} cy={y(pt.v)} r="3.5" fill={bad(pt.v) ? "var(--alert)" : "var(--accent)"} />
      ))}
    </svg>
  );
}
