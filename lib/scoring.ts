import type { Exam, Flag, Metrics, Pupil, Report, Sway } from "./types";

// Keep in sync with docs/CHECKLIST_MAP.md
export const LIMITS = { hr: 30, sleep: 6, mood: 2, rx: 0.2, baseN: 2, plat: 0.25, pcon: 0.3, asym: 0.1, brms: 0.5 } as const;

const PUP: Record<Pupil, number> = { brisk: 0, sluggish: 1, unequal: 2 };
const SWAY: Record<Sway, number> = { none: 0, mild: 1, marked: 2, out: 3 };
const KEYS: (keyof Metrics)[] = ["pupil", "hr", "bal", "sleep", "mood", "rx", "plat", "pcon", "brms"];
const num = (v?: number) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);

export function median(xs: number[]): number {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const i = Math.floor(v.length / 2);
  return v.length % 2 ? v[i] : (v[i - 1] + v[i]) / 2;
}

export function metrics(e: Exam): Metrics {
  const r = e.res;
  const g = !r.space;
  return {
    pupil: PUP[r.pupils.l] + PUP[r.pupils.r],
    hr: g ? (r.hr.stand - r.hr.sit) * 4 : NaN,
    bal: g ? SWAY[r.bal.sway] : NaN,
    sleep: r.mood.sleep,
    mood: r.mood.score,
    rx: median(r.rx.ms),
    plat: num(r.pupils.lat),
    pcon: num(r.pupils.con),
    brms: g ? num(r.bal.rms) : NaN,
  };
}

function avg(rows: Metrics[]): Metrics {
  const out = {} as Metrics;
  for (const k of KEYS) {
    const v = rows.map((r) => r[k]).filter(Number.isFinite);
    out[k] = v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
  }
  return out;
}

function diff(a: Metrics, b: Metrics): Metrics {
  const out = {} as Metrics;
  for (const k of KEYS) out[k] = a[k] - b[k];
  return out;
}

const byTime = (xs: Exam[]) => [...xs].sort((a, b) => a.at - b.at);

export function baseline(hist: Exam[]): Metrics | null {
  const s = byTime(hist);
  return s.length < LIMITS.baseN ? null : avg(s.slice(0, LIMITS.baseN).map(metrics));
}

export function flags(e: Exam, base: Metrics | null, prev: Exam | null): Flag[] {
  const r = e.res;
  const m = metrics(e);
  const out: Flag[] = [];
  const { l, r: rt } = r.pupils;

  if (l === "unequal" || rt === "unequal") {
    out.push({ id: "pupil_uneq", stn: "pupils", msg: "Pupils unequal." });
  } else if (l === "sluggish" || rt === "sluggish") {
    const side = l === rt ? "Both pupils" : l === "sluggish" ? "Left pupil" : "Right pupil";
    out.push({ id: "pupil_slow", stn: "pupils", msg: `${side} slow to light.` });
  }

  if (m.hr > LIMITS.hr) {
    out.push({ id: "hr_high", stn: "hr", msg: `HR rose ${Math.round(m.hr)} bpm on standing.` });
  }

  if (r.bal.sway === "marked" || r.bal.sway === "out") {
    const msg = r.bal.sway === "out" ? `Stepped out at ${r.bal.secs} s, eyes closed.` : "Marked sway, eyes closed.";
    out.push({ id: "bal_bad", stn: "bal", msg });
  }

  if (prev && r.mood.sleep < LIMITS.sleep && prev.res.mood.sleep < LIMITS.sleep) {
    out.push({ id: "sleep_low", stn: "mood", msg: `Under ${LIMITS.sleep} h sleep twice running (${r.mood.sleep} h).` });
  }

  if (r.mood.score <= LIMITS.mood) {
    out.push({ id: "mood_low", stn: "mood", msg: `Mood ${r.mood.score}/5.` });
  }

  if (base && Number.isFinite(m.rx) && Number.isFinite(base.rx) && m.rx > base.rx * (1 + LIMITS.rx)) {
    const pct = Math.round((m.rx / base.rx - 1) * 100);
    out.push({ id: "rx_slow", stn: "rx", msg: `Reaction ${pct}% slower (${Math.round(m.rx)} ms).` });
  }

  const has = (id: string) => out.some((f) => f.id === id);
  const up = (v: number, b: number | undefined, k: number) => base && Number.isFinite(v) && Number.isFinite(b as number) && v > (b as number) * (1 + k);

  if (!has("pupil_uneq") && Number.isFinite(num(r.pupils.asym)) && num(r.pupils.asym) > LIMITS.asym) {
    out.push({ id: "pupil_uneq", stn: "pupils", msg: `Eyes shrank by different amounts (${Math.round(num(r.pupils.asym) * 100)} pts apart).` });
  }
  if (!has("pupil_slow") && !has("pupil_uneq")) {
    if (up(m.plat, base?.plat, LIMITS.plat)) {
      out.push({ id: "pupil_slow", stn: "pupils", msg: `Pupils ${Math.round(m.plat)} ms to react, usual ${Math.round(base!.plat)} ms.` });
    } else if (base && Number.isFinite(m.pcon) && Number.isFinite(base.pcon) && m.pcon < base.pcon * (1 - LIMITS.pcon)) {
      out.push({ id: "pupil_slow", stn: "pupils", msg: `Pupils shrank ${Math.round(m.pcon * 100)}%, usual ${Math.round(base.pcon * 100)}%.` });
    }
  }
  if (!has("bal_bad") && up(m.brms, base?.brms, LIMITS.brms)) {
    out.push({ id: "bal_bad", stn: "bal", msg: `Sway ${Math.round((m.brms / base!.brms - 1) * 100)}% above usual.` });
  }

  return out;
}

export function report(e: Exam, hist: Exam[]): Report {
  const s = byTime(hist);
  const i = s.findIndex((x) => x.id === e.id);
  const prior = i >= 0 ? s.slice(0, i) : s.filter((x) => x.at < e.at);
  const base = baseline(prior);
  const m = metrics(e);
  return {
    exam: e,
    m,
    base,
    delta: base ? diff(m, base) : null,
    flags: flags(e, base, prior.at(-1) ?? null),
  };
}
