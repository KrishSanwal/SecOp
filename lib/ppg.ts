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
  const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
  const track = s.getVideoTracks()[0];
  let torch = false;
  try {
    await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] });
    torch = true;
  } catch {}
  return { s, torch };
}

/** Sample the camera for `secs` and return heart rate. `tick` reports live progress. */
export function measureHr(v: HTMLVideoElement, secs: number, tick?: (p: { t: number; on: boolean; bpm: number }) => void): PpgRun {
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
        if (tick && tr.length % 15 === 0) tick({ t, on, bpm: analyse(tr.slice(-180)).bpm });
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
  if (xs.length < 60) return { bpm: NaN, beats: 0, q, trace: [] };

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

/** Is a lit fingertip covering the lens right now? */
export function finger(v: HTMLVideoElement, c: HTMLCanvasElement): boolean {
  if (v.readyState < 2) return false;
  c.width = c.height = 20;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const w = v.videoWidth, h = v.videoHeight, s = Math.min(w, h) / 2;
  ctx.drawImage(v, w / 2 - s / 2, h / 2 - s / 2, s, s, 0, 0, 20, 20);
  const d = ctx.getImageData(0, 0, 20, 20).data;
  let r = 0, g = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; }
  return r / 400 > 100 && g < r * 0.6;
}
