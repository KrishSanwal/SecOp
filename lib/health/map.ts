import type { Day } from "./types";

type O = Record<string, unknown>;

export const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};

const obj = (v: unknown): O | undefined => (v && typeof v === "object" ? (v as O) : undefined);

export function civil(o: unknown): string | undefined {
  const x = obj(o);
  const y = num(x?.year), m = num(x?.month), d = num(x?.day);
  return y && m && d ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : undefined;
}

export function local(t: unknown, off: unknown): string | undefined {
  if (typeof t !== "string") return undefined;
  const ms = Date.parse(t);
  if (Number.isNaN(ms)) return undefined;
  const s = typeof off === "string" ? Number(off.replace("s", "")) : 0;
  return new Date(ms + (Number.isFinite(s) ? s : 0) * 1000).toISOString().slice(0, 10);
}

const mins = (a: unknown, b: unknown) => {
  const x = typeof a === "string" ? Date.parse(a) : NaN;
  const y = typeof b === "string" ? Date.parse(b) : NaN;
  return Number.isNaN(x) || Number.isNaN(y) ? 0 : (y - x) / 60000;
};

export type Pts = unknown[];

function put(m: Map<string, Day>, d: string | undefined, f: Partial<Day>) {
  if (!d) return;
  const def = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== undefined && k !== "d"));
  m.set(d, Object.assign(m.get(d) ?? { d }, def));
}

const add = (m: Map<string, Day>, d: string | undefined, k: "stp" | "act" | "sed" | "irn", v: number) => {
  if (!d || !Number.isFinite(v)) return;
  const cur = m.get(d) ?? { d };
  cur[k] = (cur[k] ?? 0) + v;
  m.set(d, cur);
};

export function fold(by: Record<string, Pts>): Day[] {
  const m = new Map<string, Day>();

  for (const p of by["daily-resting-heart-rate"] ?? []) {
    const x = obj(obj(p)?.dailyRestingHeartRate);
    put(m, civil(x?.date), { rhr: num(x?.beatsPerMinute) });
  }
  for (const p of by["daily-heart-rate-variability"] ?? []) {
    const x = obj(obj(p)?.dailyHeartRateVariability);
    put(m, civil(x?.date), { hrv: num(x?.averageHeartRateVariabilityMilliseconds), shr: num(x?.nonRemHeartRateBeatsPerMinute) });
  }
  for (const p of by["daily-oxygen-saturation"] ?? []) {
    const x = obj(obj(p)?.dailyOxygenSaturation);
    put(m, civil(x?.date), { spo2: num(x?.averagePercentage) });
  }
  for (const p of by["daily-respiratory-rate"] ?? []) {
    const x = obj(obj(p)?.dailyRespiratoryRate);
    put(m, civil(x?.date), { rr: num(x?.breathsPerMinute) });
  }
  for (const p of by["daily-sleep-temperature-derivations"] ?? []) {
    const x = obj(obj(p)?.dailySleepTemperatureDerivations);
    const a = num(x?.nightlyTemperatureCelsius), b = num(x?.baselineTemperatureCelsius);
    put(m, civil(x?.date), { tmp: a !== undefined && b !== undefined ? Math.round((a - b) * 10) / 10 : undefined });
  }
  for (const p of by["daily-vo2-max"] ?? []) {
    const x = obj(obj(p)?.dailyVo2Max);
    put(m, civil(x?.date), { vo2: num(x?.vo2Max) });
  }

  for (const p of by.sleep ?? []) {
    const s = obj(obj(p)?.sleep);
    const iv = obj(s?.interval);
    const sum = obj(s?.summary);
    const day = local(iv?.endTime, iv?.endUtcOffset);
    const st = Array.isArray(s?.stages) ? (s.stages as unknown[]) : [];
    const by_ = (t: string) =>
      st.reduce<number>((a, g) => {
        const o = obj(g);
        return o?.type === t ? a + mins(o.startTime, o.endTime) : a;
      }, 0);
    const asleep = num(sum?.minutesAsleep);
    if (asleep === undefined) continue;
    const cur = m.get(day ?? "")?.slp ?? 0;
    put(m, day, { slp: cur + asleep, deep: st.length ? Math.round(by_("DEEP")) : undefined, rem: st.length ? Math.round(by_("REM")) : undefined });
  }

  for (const p of by.steps ?? []) {
    const x = obj(obj(p)?.steps);
    const iv = obj(x?.interval);
    add(m, local(iv?.startTime, iv?.startUtcOffset), "stp", num(x?.count) ?? NaN);
  }
  for (const p of by["active-minutes"] ?? []) {
    const x = obj(obj(p)?.activeMinutes);
    const iv = obj(x?.interval);
    const v = num(x?.activeMinutes) ?? (iv ? mins(iv.startTime, iv.endTime) : NaN);
    add(m, local(iv?.startTime, iv?.startUtcOffset), "act", v);
  }
  for (const p of by["sedentary-period"] ?? []) {
    const x = obj(obj(p)?.sedentaryPeriod);
    const iv = obj(x?.interval);
    add(m, local(iv?.startTime, iv?.startUtcOffset), "sed", mins(iv?.startTime, iv?.endTime));
  }
  for (const p of by["irregular-rhythm-notification"] ?? []) {
    const x = obj(obj(p)?.irregularRhythmNotification);
    const iv = obj(x?.interval);
    add(m, local(iv?.startTime, iv?.startUtcOffset), "irn", 1);
  }

  return [...m.values()].sort((a, b) => a.d.localeCompare(b.d));
}
