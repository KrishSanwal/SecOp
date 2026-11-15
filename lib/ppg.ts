// Fingertip PPG: finger over the rear camera, torch on, red channel pulses with each heartbeat.

export interface PpgRun {
  stop: () => void;
  done: Promise<PpgResult>;
}

export interface PpgResult {
  bpm: number; // NaN if no clean signal
  beats: number;
  q: number; // 0..1 share of frames with a finger on the lens
  trace: { t: number; v: number }[];
}

export async function openRear() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser has no camera access. Open the page in Chrome or Safari, over https.");
  const s = await navigator.mediaDevices
    .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
    .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }));
  const track = s.getVideoTracks()[0];
  let torch = false;
  try {
    await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
    torch = true;
  } catch {}
  return { s, torch };
}

/** Sample the camera for `secs` and return heart rate. `tick` reports live progress. */
export function measureHr(v: HTMLVideoElement, secs: number, tick?: (p: { t: number; on: boolean; hard: boolean; bpm: number; wave: number[]; beat: boolean }) => void): PpgRun {
  const c = document.createElement("canvas");
  c.width = c.height = 40;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const tr: { t: number; v: number; on: boolean }[] = [];
  let live = true;
  const t0 = performance.now();

  const done = new Promise<PpgResult>((res) => {
    const step = () => {
      const t = performance.now() - t0;
      if (!live || t > secs * 1000) {
        live = false;
        return res(analyse(tr));
      }
      if (v.readyState >= 2) {
        const w = v.videoWidth, h = v.videoHeight, s = Math.min(w, h) / 2;
        ctx.drawImage(v, w / 2 - s / 2, h / 2 - s / 2, s, s, 0, 0, 40, 40);
        const d = ctx.getImageData(0, 0, 40, 40).data;
        let r = 0, g = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; }
        r /= d.length / 4; g /= d.length / 4;
        const on = r > 100 && g < r * 0.6; // lens covered by a lit fingertip
        tr.push({ t, v: r, on });
        if (tick && tr.length % 3 === 0) {
          const a = analyse(tr.slice(-150));
          const w = a.trace.slice(-90).map((x) => x.v);
          const n = w.length;
          const beat = n > 4 && w[n - 3] > w[n - 4] && w[n - 3] >= w[n - 2] && w[n - 3] > 0.5 * Math.max(...w.map(Math.abs));
          tick({ t, on, hard: on && r > 248 && g < 8, bpm: tr.length % 15 === 0 ? analyse(tr.slice(-180)).bpm : NaN, wave: w, beat });
        }
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  return { stop: () => { live = false; }, done };
}

export function analyse(tr: { t: number; v: number; on: boolean }[]): PpgResult {
  const q = tr.length ? tr.filter((x) => x.on).length / tr.length : 0;
  const xs = tr.filter((x) => x.on);
  if (xs.length < 45) return { bpm: NaN, beats: 0, q, trace: [] };

  // Detrend with a ~1 s moving average, then smooth with ~0.15 s.
  const ma = (a: number[], w: number) => a.map((_, i) => { const s = a.slice(Math.max(0, i - w), i + w + 1); return s.reduce((p, q) => p + q, 0) / s.length; });
  const fps = xs.length / ((xs.at(-1)!.t - xs[0].t) / 1000);
  const raw = xs.map((x) => x.v);
  const base = ma(raw, Math.round(fps * 0.5));
  const sig = ma(raw.map((v, i) => base[i] - v), Math.max(1, Math.round(fps * 0.07))); // blood in = darker, so invert

  const sd = Math.sqrt(sig.reduce((a, v) => a + v * v, 0) / sig.length);
  const gap = (60 / 200) * 1000; // max 200 bpm
  const peaks: number[] = [];
  for (let i = 1; i < sig.length - 1; i++) {
    if (sig[i] > sd * 0.5 && sig[i] >= sig[i - 1] && sig[i] > sig[i + 1]) {
      const t = xs[i].t;
      if (!peaks.length || t - peaks.at(-1)! > gap) peaks.push(t);
    }
  }
  const iv = peaks.slice(1).map((t, i) => t - peaks[i]).filter((d) => d > 300 && d < 2000).sort((a, b) => a - b);
  const bpm = iv.length >= 4 ? 60000 / iv[Math.floor(iv.length / 2)] : NaN;
  return { bpm, beats: peaks.length, q, trace: xs.map((x, i) => ({ t: x.t, v: sig[i] })) };
}

/** Torch off first (some Android builds keep it lit otherwise), then release the camera. */
export async function closeRear(s: MediaStream | null) {
  if (!s) return;
  for (const t of s.getVideoTracks()) {
    try {
      await t.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] });
    } catch {}
  }
  s.getTracks().forEach((t) => t.stop());
}

/** Is a lit fingertip covering the lens, and is it pressed so hard the image saturates? */
export function finger(v: HTMLVideoElement, c: HTMLCanvasElement): { on: boolean; hard: boolean } {
  if (v.readyState < 2) return { on: false, hard: false };
  c.width = c.height = 20;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const w = v.videoWidth, h = v.videoHeight, s = Math.min(w, h) / 2;
  ctx.drawImage(v, w / 2 - s / 2, h / 2 - s / 2, s, s, 0, 0, 20, 20);
  const d = ctx.getImageData(0, 0, 20, 20).data;
  let r = 0, g = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; }
  r /= 400; g /= 400;
  const on = r > 100 && g < r * 0.6;
  // Red pinned near 255 with almost no green = blood squeezed out or sensor clipped: no pulse visible.
  return { on, hard: on && r > 248 && g < 8 };
}

/** Pulse the phone at `bpm` for `secs`. No-op where vibration is unsupported. */
export function thump(bpm: number, secs = 5) {
  if (!Number.isFinite(bpm) || !navigator.vibrate) return;
  const gap = Math.round(60000 / bpm);
  const n = Math.max(1, Math.round((secs * 1000) / gap));
  navigator.vibrate(Array.from({ length: n }, () => [60, gap - 60]).flat());
}
