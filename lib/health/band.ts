import type { Beat } from "./map";

export type Span = [number, number];

const LAST = 30_000;

function avg(pts: Beat[], [a, b]: Span, min: number) {
  const v = pts.filter((p) => p.t >= a && p.t < b).map((p) => p.bpm);
  return v.length >= min ? Math.round(v.reduce((x, y) => x + y, 0) / v.length) : NaN;
}

// last 30 s of each phase; if the band logged too few samples there, the whole phase
export function bandHr(pts: Beat[], sit: Span, stand: Span) {
  const tail = ([a, b]: Span): Span => [Math.max(a, b - LAST), b];
  const one = (s: Span) => {
    const n = avg(pts, tail(s), 2);
    return Number.isFinite(n) ? n : avg(pts, s, 1);
  };
  return { sit: one(sit), stand: one(stand) };
}
