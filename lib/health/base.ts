import { META } from "./meta";
import type { Day, HFlag, MK } from "./types";

export const LIM = {
  baseN: 14,
  minN: 5,
  rhrUp: 6,
  shrUp: 6,
  hrvDrop: 0.25,
  slpLow: 360,
  spo2Low: 92,
  spo2Drop: 3,
  rrUp: 2,
  tmpUp: 1,
};

const vals = (days: Day[], k: MK) => days.map((d) => d[k]).filter((v): v is number => typeof v === "number");
const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

export function usual(prior: Day[], k: MK): number | null {
  const xs = vals(prior.slice(-LIM.baseN), k);
  return xs.length >= LIM.minN ? mean(xs) : null;
}

export function latest(days: Day[], k: MK): { v: number; i: number } | null {
  for (let i = days.length - 1; i >= 0; i--) {
    const v = days[i][k];
    if (typeof v === "number") return { v, i };
  }
  return null;
}

export function flags(days: Day[]): HFlag[] {
  const out: HFlag[] = [];
  const add = (id: string, k: MK, msg: string) => out.push({ id, k, msg });
  const cur = (k: MK) => {
    const l = latest(days, k);
    return l && l.i >= days.length - 2 ? { v: l.v, b: usual(days.slice(0, l.i), k) } : null;
  };

  const rhr = cur("rhr");
  if (rhr?.b != null && rhr.v - rhr.b > LIM.rhrUp) add("rhr_up", "rhr", `Resting heart rate is ${Math.round(rhr.v - rhr.b)} bpm above usual.`);
  const shr = cur("shr");
  if (shr?.b != null && shr.v - shr.b > LIM.shrUp) add("shr_up", "shr", `Sleeping heart rate is ${Math.round(shr.v - shr.b)} bpm above usual.`);
  const hrv = cur("hrv");
  if (hrv?.b != null && hrv.v < hrv.b * (1 - LIM.hrvDrop)) add("hrv_low", "hrv", `Heart rate variability is ${Math.round((1 - hrv.v / hrv.b) * 100)}% below usual.`);

  const slp = vals(days.slice(-2), "slp");
  if (slp.length === 2 && slp.every((v) => v < LIM.slpLow)) add("slp_low", "slp", "Under 6 hours of sleep two nights running.");

  const o2 = cur("spo2");
  if (o2 && (o2.v < LIM.spo2Low || (o2.b != null && o2.b - o2.v > LIM.spo2Drop))) add("spo2_low", "spo2", `Blood oxygen averaged ${o2.v.toFixed(1)}% overnight.`);
  const rr = cur("rr");
  if (rr?.b != null && rr.v - rr.b > LIM.rrUp) add("rr_up", "rr", `Breathing rate is ${(rr.v - rr.b).toFixed(1)} per minute above usual.`);
  const tmp = cur("tmp");
  if (tmp && tmp.v > LIM.tmpUp) add("tmp_up", "tmp", `Skin temperature ran ${tmp.v.toFixed(1)} °C above your normal.`);
  const irn = days.at(-1)?.irn;
  if (irn && irn > 0) add("irn", "irn", "The Actiwatch sent an irregular rhythm alert.");
  return out;
}

export function verdict(days: Day[], fl: HFlag[]): { t: string; why: string } {
  const has = META.some((m) => latest(days, m.k));
  if (!has) return { t: "Could not measure", why: "No Actiwatch data yet. Wear it overnight and sync." };
  if (!fl.length) return { t: "Looks normal", why: "Everything is close to your usual." };
  const rec = fl.filter((f) => ["rhr_up", "shr_up", "hrv_low", "slp_low"].includes(f.id)).length;
  return {
    t: "Worth a recheck",
    why: rec >= 3 ? "Several recovery signals moved together. Rest, drink water and recheck tomorrow." : "One or more readings moved away from your usual.",
  };
}

export function digest(days: Day[]) {
  return META.flatMap((m) => {
    const l = latest(days, m.k);
    if (!l) return [];
    const b = usual(days.slice(0, l.i), m.k);
    return [{ k: m.k, t: m.t, v: m.fmt(l.v), usual: b == null ? null : m.fmt(b) }];
  });
}
