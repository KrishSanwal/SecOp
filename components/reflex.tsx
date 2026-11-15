import { CURVE_STEP, CURVE_T0 } from "@/lib/pupil";

/** Pupil size over time around the flash; `prev` is the last exam's curve, drawn faint. */
export function ReflexGraph({ now, prev }: { now: number[]; prev?: number[] | null }) {
  const W = 320, H = 110, px = 8, py = 10;
  const all = [...now, ...(prev ?? [])].filter(Number.isFinite);
  if (all.length < 3) return null;
  const lo = Math.min(0.5, ...all), hi = Math.max(1.05, ...all);
  const x = (i: number) => px + (i / (now.length - 1)) * (W - 2 * px);
  const y = (v: number) => py + (1 - (v - lo) / (hi - lo)) * (H - 2 * py);
  const path = (c: number[]) => {
    let d = "", pen = false;
    c.forEach((v, i) => {
      if (!Number.isFinite(v)) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const fx = x(-CURVE_T0 / CURVE_STEP);
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full rounded-lg bg-cabin" role="img" aria-label="Pupil size before and after the light">
        <line x1={fx} x2={fx} y1={0} y2={H} stroke="var(--edge)" strokeDasharray="4 4" />
        <line x1={px} x2={W - px} y1={y(1)} y2={y(1)} stroke="var(--rule)" />
        {prev && <path d={path(prev)} fill="none" stroke="var(--dim)" strokeWidth="2" opacity="0.45" />}
        <path d={path(now)} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      </svg>
      <figcaption className="flex justify-between text-sm text-dim">
        <span>Pupil size. Dashed line: light on.</span>
        {prev && <span>Grey: last exam</span>}
      </figcaption>
    </figure>
  );
}
