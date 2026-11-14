import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// MediaPipe iris landmarks: centre then 4 edge points.
const IRIS = { r: [468, 469, 470, 471, 472], l: [473, 474, 475, 476, 477] } as const;
const LID = { r: [159, 145], l: [386, 374] } as const; // upper, lower
export type Eye = keyof typeof IRIS;

let lm: Promise<FaceLandmarker> | null = null;

export function landmarker() {
  const make = (fs: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>, delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate },
      runningMode: "VIDEO",
      numFaces: 1,
    });
  // Some phones refuse the GPU path; fall back to CPU.
  lm ??= FilesetResolver.forVisionTasks("/mp").then((fs) => make(fs, "GPU").catch(() => make(fs, "CPU")));
  lm.catch(() => { lm = null; });
  return lm;
}

export interface Frame {
  t: number;
  ratio: number; // pupil radius / iris radius, NaN if not found
  irisPx: number;
  face: boolean;
  open: number; // lid gap / iris diameter
  lum: number; // mean brightness inside the iris, 0-255
  cx: number;
  cy: number;
  sep: number; // pupil vs iris contrast, 0..1
}

const SIDE = 96;

/** Measure one eye in the current video frame. `dbg` gets the thresholded crop when given. */
export function measure(f: FaceLandmarker, v: HTMLVideoElement, t: number, eye: Eye, work: HTMLCanvasElement, dbg?: HTMLCanvasElement): Frame {
  const res = f.detectForVideo(v, t);
  const pts = res.faceLandmarks?.[0];
  const none = { t, ratio: NaN, irisPx: 0, face: false, open: 0, lum: 0, cx: 0, cy: 0, sep: 0 };
  if (!pts) return none;

  const [c, ...edge] = IRIS[eye].map((i) => pts[i]);
  const W = v.videoWidth, H = v.videoHeight;
  const cx = c.x * W, cy = c.y * H;
  const r = edge.reduce((a, p) => a + Math.hypot(p.x * W - cx, p.y * H - cy), 0) / edge.length;
  const [up, lo] = LID[eye].map((i) => pts[i]);
  const open = Math.hypot((up.x - lo.x) * W, (up.y - lo.y) * H) / (2 * r || 1);
  if (r < 6) return { ...none, face: true, irisPx: r, open, cx, cy };

  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  work.width = work.height = SIDE;
  ctx.drawImage(v, cx - r, cy - r, 2 * r, 2 * r, 0, 0, SIDE, SIDE);
  const px = ctx.getImageData(0, 0, SIDE, SIDE);

  const { inP, frac, mean, sep } = segment(px.data, SIDE);
  if (dbg) {
    for (let k = 0; k < inP.length; k++) {
      const i = k * 4;
      if (inP[k]) { px.data[i] = 255; px.data[i + 1] = 60; px.data[i + 2] = 60; }
      else { px.data[i] *= 0.45; px.data[i + 1] *= 0.45; px.data[i + 2] *= 0.45; }
    }
    dbg.width = dbg.height = SIDE;
    dbg.getContext("2d")!.putImageData(px, 0, 0);
  }
  return { t, ratio: Math.sqrt(frac) * 0.85, irisPx: r, face: true, open, lum: mean, cx, cy, sep };
}

/** Find the pupil in a square RGBA crop centred on the iris. Pure, for tests. */
export function segment(data: Uint8ClampedArray, SIDE: number) {
  const px = { data };
  // Red channel: brown irises reflect red, the pupil does not, so this separates them best on RGB cameras.
  const R = SIDE / 2, inner = R * 0.85, seedR = R * 0.45;
  const val = new Float32Array(SIDE * SIDE).fill(-1);
  const vals: number[] = [];
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++) {
      if (Math.hypot(x - R, y - R) > inner) continue;
      const v = px.data[(y * SIDE + x) * 4];
      val[y * SIDE + x] = v;
      vals.push(v);
    }
  const sorted = [...vals].sort((p, q) => p - q);
  const glint = Math.max(200, sorted[Math.floor(sorted.length * 0.99)] ?? 255); // flash reflection on the cornea
  const th = otsu(vals.filter((v) => v < glint));

  // Grow the pupil from the darkest pixel near the centre; glints inside it count as pupil.
  let seed = -1, best = 1e9;
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++) {
      const k = y * SIDE + x, v = val[k];
      if (v < 0 || Math.hypot(x - R, y - R) > seedR) continue;
      if (v < best) { best = v; seed = k; }
    }
  const inP = new Uint8Array(SIDE * SIDE);
  let dark = 0;
  if (seed >= 0 && best <= th) {
    const q = [seed];
    inP[seed] = 1;
    while (q.length) {
      const k = q.pop()!;
      dark++;
      const x = k % SIDE, y = (k / SIDE) | 0;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= SIDE || ny >= SIDE) continue;
        const n = ny * SIDE + nx;
        if (inP[n]) continue;
        const v = val[n];
        if (v >= 0 && (v <= th || v >= glint)) { inP[n] = 1; q.push(n); }
      }
    }
  }
  // Pupil area as a share of the inner disk -> radius ratio vs the full iris.
  const frac = dark / (vals.length || 1);
  const mean = vals.reduce((p, q) => p + q, 0) / (vals.length || 1);
  // Contrast between pupil and the rest of the iris; low = camera can't tell them apart.
  let pin = 0, pn = 0, rin = 0, rn = 0;
  for (let k = 0; k < inP.length; k++) {
    const v = val[k];
    if (v < 0 || v >= glint) continue;
    if (inP[k]) { pin += v; pn++; } else { rin += v; rn++; }
  }
  const sep = pn && rn ? (rin / rn - pin / pn) / (rin / rn || 1) : 0;
  return { inP, frac, mean, sep, th };
}

function otsu(xs: number[]): number {
  const h = new Array(256).fill(0);
  for (const x of xs) h[Math.min(255, Math.max(0, Math.round(x)))]++;
  const n = xs.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * h[i];
  let sB = 0, wB = 0, best = 0, th = 0;
  for (let i = 0; i < 256; i++) {
    wB += h[i];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sB += i * h[i];
    const mB = sB / wB, mF = (sum - sB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > best) { best = v; th = i; }
  }
  return th;
}

export interface Check {
  id: string;
  ok: boolean;
  fix: string;
}

/** Live readiness from the last ~0.5 s of frames. */
export function ready(fs: Frame[]): Check[] {
  const f = fs.at(-1);
  const recent = fs.slice(-15);
  const move = recent.length > 5 ? Math.max(...recent.map((x) => Math.hypot(x.cx - recent[0].cx, x.cy - recent[0].cy))) / (f?.irisPx || 1) : 9;
  if (!f?.face) return [{ id: "face", ok: false, fix: "Point the front camera at your face" }];
  return [
    { id: "face", ok: true, fix: "" },
    { id: "near", ok: !!f && f.irisPx >= 22, fix: "Move the phone closer to your eye" },
    { id: "far", ok: !!f && f.irisPx <= 140, fix: "Move the phone a little further away" },
    { id: "open", ok: !!f && f.open > 0.55, fix: "Open your eye wide" },
    { id: "light", ok: !!f && f.lum > 35, fix: "Turn the room lights on" },
    { id: "still", ok: move < 0.35, fix: "Hold the phone still" },
    { id: "sep", ok: med(recent.map((x) => x.sep)) > 0.12, fix: "Pupil not visible yet: add more light from the front, or switch to the back camera with flash" },
  ];
}

export interface Reflex {
  base: number; // ratio before the flash
  min: number;
  con: number; // constriction share, 0..1
  lat: number; // ms from flash to 10% of the drop
  ok: boolean; // enough clean frames
}

/** Light reflex from a run of frames; `flash` is the time the light came on. */
export function reflex(fs: Frame[], flash: number): Reflex {
  const good = fs.filter((f) => Number.isFinite(f.ratio));
  const pre = good.filter((f) => f.t < flash && f.t > flash - 1000).map((f) => f.ratio);
  const post = good.filter((f) => f.t >= flash && f.t < flash + 2000);
  const ok = pre.length >= 8 && post.length >= 20;
  const base = med(pre);
  const smooth = post.map((f, i) => ({ t: f.t, r: med(post.slice(Math.max(0, i - 2), i + 3).map((p) => p.ratio)) }));
  const min = Math.min(...smooth.map((s) => s.r));
  const drop = base - min;
  const hit = smooth.find((s) => base - s.r >= drop * 0.1);
  return { base, min, con: base > 0 ? drop / base : NaN, lat: hit ? hit.t - flash : NaN, ok };
}

function med(xs: number[]) {
  const v = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
}
