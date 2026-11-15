import type { Day } from "./types";

const DAY = 86_400_000;

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function demo(id: string, drift: boolean, n = 30, now = Date.now()): Day[] {
  const r = rng(id);
  const jit = (s: number) => (r() - 0.5) * 2 * s;
  const rhr0 = 56 + Math.round(r() * 8);
  const hrv0 = 52 + Math.round(r() * 20);
  return Array.from({ length: n }, (_, i) => {
    const ago = n - 1 - i;
    const k = drift ? Math.max(0, 5 - ago) / 5 : 0;
    const slp = 440 + jit(30) - k * 110;
    const deep = slp * (0.17 + jit(0.02));
    const rem = slp * (0.22 + jit(0.02));
    return {
      d: iso(now - ago * DAY),
      rhr: Math.round(rhr0 + jit(1.5) + k * 9),
      shr: Math.round(rhr0 - 7 + jit(1.5) + k * 8),
      hrv: Math.round(hrv0 + jit(5) - k * hrv0 * 0.35),
      slp: Math.round(slp),
      deep: Math.round(deep),
      rem: Math.round(rem),
      spo2: Math.round((96.5 + jit(0.6) - k * 1.2) * 10) / 10,
      rr: Math.round((14.5 + jit(0.4) + k * 1.8) * 10) / 10,
      tmp: Math.round((jit(0.3) + k * 0.6) * 10) / 10,
      stp: Math.round(7500 + jit(2500)),
      act: Math.round(38 + jit(14) - k * 14),
      vo2: Math.round((44 + i * 0.02 + jit(0.3)) * 10) / 10,
      sed: Math.round(520 + jit(60) + k * 40),
      irn: 0,
    };
  });
}
