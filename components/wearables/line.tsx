import { LIM, latest, usual } from "@/lib/health/base";
import { byK } from "@/lib/health/meta";
import type { Day, MK } from "@/lib/health/types";

const off = (k: MK, v: number, b: number | null) => {
  if (k === "tmp") return v > LIM.tmpUp;
  if (k === "slp") return v < LIM.slpLow;
  if (k === "spo2") return v < LIM.spo2Low || (b != null && b - v > LIM.spo2Drop);
  if (b == null) return false;
  if (k === "rhr") return v - b > LIM.rhrUp;
  if (k === "shr") return v - b > LIM.shrUp;
  if (k === "hrv") return v < b * (1 - LIM.hrvDrop);
  if (k === "rr") return v - b > LIM.rrUp;
  return false;
};

export function Line({ days, k, big = false }: { days: Day[]; k: MK; big?: boolean }) {
  const m = byK[k];
  if (k === "irn") return null;
  const W = 320, H = big ? 140 : 56, pad = 8;
  const pts = days.flatMap((d, i) => (typeof d[k] === "number" ? [{ i, v: d[k] as number, d: d.d }] : []));
  if (pts.length < 2) return <p className="text-sm text-dim">Needs two days of readings.</p>;

  const l = latest(days, k)!;
  const base = usual(days.slice(0, l.i), k);
  const vs = pts.map((p) => p.v).concat(base ?? []);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const span = hi - lo;
  const x = (i: number) => pad + (i / Math.max(1, days.length - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - 2 * pad);
  const path = pts.map((p, j) => `${j && p.i - pts[j - 1].i === 1 ? "L" : "M"}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const bad = (v: number) => off(k, v, base);
  const last = pts.at(-1)!;
  const label = `${m.t}, ${pts.length} days. Latest ${m.fmt(last.v)}${base != null ? `, usual ${m.fmt(base)}` : ""}. Range ${m.fmt(Math.min(...pts.map((p) => p.v)))} to ${m.fmt(Math.max(...pts.map((p) => p.v)))}.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={big ? "h-40 w-full" : "h-14 w-full"} role="img" aria-label={label}>
      {base != null && <line x1={pad} x2={W - pad} y1={y(base)} y2={y(base)} stroke="var(--edge)" strokeWidth={big ? 8 : 6} strokeLinecap="round" opacity="0.5" />}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) =>
        bad(p.v) ? (
          <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="4.5" fill="var(--cabin)" stroke="var(--alert)" strokeWidth="2.5" />
        ) : (
          big || p.i === last.i ? <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={p.i === last.i ? 3.5 : 2.5} fill="var(--accent)" /> : null
        ),
      )}
    </svg>
  );
}
