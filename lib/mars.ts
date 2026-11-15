// Earth-Mars distance and one-way light time from mean orbital elements (JPL approximations, J2000).
// Good to a few percent, which is plenty for "how long until the surgeon can answer".

const AU_KM = 149_597_870.7;
const C_KM_S = 299_792.458;
const D2R = Math.PI / 180;

type El = [a: number, e: number, i: number, L: number, w: number, O: number];
const EARTH: [El, El] = [
  [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0],
  [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
];
const MARS: [El, El] = [
  [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
  [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
];

function pos([e0, dt]: [El, El], T: number): [number, number, number] {
  const [a, e, i, L, w, O] = e0.map((v, k) => v + dt[k] * T) as El;
  const M = (((L - w) % 360) + 540) % 360 - 180;
  let E = M + (180 / Math.PI) * e * Math.sin(M * D2R);
  for (let n = 0; n < 8; n++) {
    const d = (E - (180 / Math.PI) * e * Math.sin(E * D2R) - M) / (1 - e * Math.cos(E * D2R));
    E -= d;
    if (Math.abs(d) < 1e-7) break;
  }
  const x = a * (Math.cos(E * D2R) - e);
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E * D2R);
  const ww = (w - O) * D2R, oo = O * D2R, ii = i * D2R;
  const cw = Math.cos(ww), sw = Math.sin(ww), co = Math.cos(oo), so = Math.sin(oo), ci = Math.cos(ii), si = Math.sin(ii);
  return [
    (cw * co - sw * so * ci) * x + (-sw * co - cw * so * ci) * y,
    (cw * so + sw * co * ci) * x + (-sw * so + cw * co * ci) * y,
    sw * si * x + cw * si * y,
  ];
}

/** Earth-Mars distance in km and one-way light time in seconds, for a date. */
export function mars(at = new Date()) {
  const T = (at.getTime() / 86_400_000 + 2440587.5 - 2451545) / 36525;
  const [ex, ey, ez] = pos(EARTH, T);
  const [mx, my, mz] = pos(MARS, T);
  const au = Math.hypot(mx - ex, my - ey, mz - ez);
  const km = au * AU_KM;
  return { au, km, oneWaySec: km / C_KM_S };
}

export const mins = (s: number) => `${Math.round(s / 60)} min`;

/** Short text summary of an exam, sized for a thin link. */
export function packet(name: string, at: number, flags: string[], m: Record<string, number>): string {
  const d = new Date(at).toISOString().slice(0, 16).replace("T", " ");
  const n = (k: string, f = 0) => (Number.isFinite(m[k]) ? (f ? m[k].toFixed(f) : Math.round(m[k])) : "-");
  return `SO ${name} ${d}Z | ${flags.length ? "FLAGS " + flags.join(",") : "CLEAR"} | hr+${n("hr")} rx${n("rx")} sleep${n("sleep", 1)} mood${n("mood")} pupil${n("pupil")} bal${n("bal")}`;
}
