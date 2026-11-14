import { metrics } from "./scoring";
import type { Exam, Metrics } from "./types";

export type Key = keyof Metrics;

// What each metric means to a person. worse: +1 if higher is worse.
export const META: { k: Key; t: string; unit: string; worse: 1 | -1; fmt: (v: number) => string }[] = [
  { k: "rx", t: "Reaction", unit: "ms", worse: 1, fmt: (v) => `${Math.round(v)} ms` },
  { k: "sleep", t: "Sleep", unit: "h", worse: -1, fmt: (v) => `${v.toFixed(1)} h` },
  { k: "mood", t: "Mood", unit: "/5", worse: -1, fmt: (v) => `${v.toFixed(1)} of 5` },
  { k: "hr", t: "Heart rate rise on standing", unit: "bpm", worse: 1, fmt: (v) => `${Math.round(v)} bpm` },
  { k: "brms", t: "Sway", unit: "m/s²", worse: 1, fmt: (v) => `${v.toFixed(2)} m/s²` },
  { k: "bal", t: "Balance rating", unit: "", worse: 1, fmt: (v) => ["steady", "mild sway", "marked sway", "stepped out"][Math.round(v)] ?? v.toFixed(1) },
  { k: "plat", t: "Pupil reaction time", unit: "ms", worse: 1, fmt: (v) => `${Math.round(v)} ms` },
  { k: "pcon", t: "Pupil constriction", unit: "%", worse: -1, fmt: (v) => `${Math.round(v * 100)}%` },
  { k: "pupil", t: "Pupil rating", unit: "pt", worse: 1, fmt: (v) => (v === 0 ? "both brisk" : `${v.toFixed(1)} pt`) },
];

export type Point = { at: number; v: number };

/** One series per metric, oldest first, skipping exams where it wasn't measured. */
export function series(hist: Exam[]): Record<Key, Point[]> {
  const out = {} as Record<Key, Point[]>;
  for (const m of META) out[m.k] = [];
  for (const e of [...hist].sort((a, b) => a.at - b.at)) {
    const ms = metrics(e);
    for (const m of META) if (Number.isFinite(ms[m.k])) out[m.k].push({ at: e.at, v: ms[m.k] });
  }
  return out;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Up to `max` plain-language observations about the latest exam in context of the history. */
export function insights(hist: Exam[], max = 3): string[] {
  const s = series(hist);
  const out: { w: number; t: string }[] = [];

  for (const m of META) {
    const p = s[m.k];
    if (p.length < 3) continue;
    const last = p.slice(-3).map((x) => x.v);
    const now = last[2];
    const prev = p.slice(0, -1).map((x) => x.v);

    // Getting worse three exams running.
    if ((last[1] - last[0]) * m.worse > 0 && (last[2] - last[1]) * m.worse > 0) {
      out.push({ w: 3, t: `${m.t} has got worse three exams in a row: ${last.map(m.fmt).join(" → ")}.` });
      continue;
    }
    // Worst value on record.
    const worst = m.worse > 0 ? Math.max(...prev) : Math.min(...prev);
    if ((now - worst) * m.worse > 0 && Math.abs(now - worst) > Math.abs(worst) * 0.02) {
      out.push({ w: 2, t: `${m.t} is the worst on record (${m.fmt(now)}).` });
      continue;
    }
    // Back to normal after being off last time.
    const base = avg(p.slice(0, 2).map((x) => x.v));
    const off = (v: number) => (v - base) * m.worse > Math.abs(base) * 0.2;
    if (off(last[1]) && !off(now)) out.push({ w: 1, t: `${m.t} is back near usual (${m.fmt(now)}) after being off last exam.` });
  }

  // Short sleep vs reaction, once there is enough history.
  const ex = [...hist].sort((a, b) => a.at - b.at).map(metrics);
  const lo = ex.filter((m) => m.sleep < 6 && Number.isFinite(m.rx)).map((m) => m.rx);
  const hi = ex.filter((m) => m.sleep >= 6 && Number.isFinite(m.rx)).map((m) => m.rx);
  if (lo.length >= 2 && hi.length >= 2) {
    const d = avg(lo) / avg(hi) - 1;
    if (d > 0.08) out.push({ w: 2, t: `After nights under 6 h of sleep, reactions are ${Math.round(d * 100)}% slower on average.` });
  }

  return out.sort((a, b) => b.w - a.w).slice(0, max).map((x) => x.t);
}
