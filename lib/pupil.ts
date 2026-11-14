import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// MediaPipe iris landmarks: centre then 4 edge points.
const IRIS = { r: [468, 469, 470, 471, 472], l: [473, 474, 475, 476, 477] } as const;
const LID = { r: [159, 145], l: [386, 374] } as const; // upper, lower
export type Eye = keyof typeof IRIS;

let lm: Promise<FaceLandmarker> | null = null;

export function landmarker() {
  lm ??= FilesetResolver.forVisionTasks("/mp").then((fs) =>
    FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: "/models/face_landmarker.task", delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 1,
    }),
  );
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
}

const SIDE = 96;

/** Measure one eye in the current video frame. `dbg` gets the thresholded crop when given. */
export function measure(f: FaceLandmarker, v: HTMLVideoElement, t: number, eye: Eye, work: HTMLCanvasElement, dbg?: HTMLCanvasElement): Frame {
  const res = f.detectForVideo(v, t);
  const pts = res.faceLandmarks?.[0];
  const none = { t, ratio: NaN, irisPx: 0, face: false, open: 0, lum: 0, cx: 0, cy: 0 };
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

  // Luma inside 85% of the iris disk (skip the lids and the iris rim).
  const R = SIDE / 2, inner = R * 0.85;
  const lum: number[] = [];
  const idx: number[] = [];
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++) {
      if (Math.hypot(x - R, y - R) > inner) continue;
      const i = (y * SIDE + x) * 4;
      lum.push(0.299 * px.data[i] + 0.587 * px.data[i + 1] + 0.114 * px.data[i + 2]);
      idx.push(i);
    }
  const th = otsu(lum);
  let dark = 0;
  for (let k = 0; k < lum.length; k++) {
    const d = lum[k] < th;
    if (d) dark++;
    if (dbg) {
      const i = idx[k];
      px.data[i] = d ? 255 : px.data[i] * 0.4;
      px.data[i + 1] = d ? 40 : px.data[i + 1] * 0.4;
      px.data[i + 2] = d ? 40 : px.data[i + 2] * 0.4;
    }
  }
  if (dbg) {
    dbg.width = dbg.height = SIDE;
    dbg.getContext("2d")!.putImageData(px, 0, 0);
  }
  // Dark area as a share of the inner disk -> radius ratio vs the full iris.
  const frac = dark / lum.length;
  const mean = lum.reduce((a, b) => a + b, 0) / (lum.length || 1);
  return { t, ratio: Math.sqrt(frac) * 0.85, irisPx: r, face: true, open, lum: mean, cx, cy };
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
