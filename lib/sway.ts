// Balance from the motion sensor: phone held flat against the chest, eyes closed.

export interface SwayResult {
  rms: number; // m/s^2, sway without gravity
  peak: number;
  out: boolean; // a jolt big enough to mean a step or a catch
  dead: boolean; // sensor never reported
  secs: number; // seconds held before `out`, or the full run
  n: number;
}

const STEP = 3; // m/s^2 jolt = stepped out

/** iOS needs a tap-triggered permission request; call this from a click handler. */
export async function askMotion(): Promise<boolean> {
  if (typeof DeviceMotionEvent === "undefined") return false;
  const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
  if (typeof D.requestPermission === "function") return (await D.requestPermission().catch(() => "denied")) === "granted";
  return true;
}

export function measureSway(secs: number, tick?: (p: { t: number; rms: number }) => void) {
  const xs: { t: number; a: number }[] = [];
  const t0 = performance.now();
  let g = { x: 0, y: 0, z: 0 };
  let stop = () => {};
  let ended = false;

  const done = new Promise<SwayResult>((res) => {
    const on = (e: DeviceMotionEvent) => {
      const t = performance.now() - t0;
      let a: number;
      if (e.acceleration?.x != null) {
        a = Math.hypot(e.acceleration.x ?? 0, e.acceleration.y ?? 0, e.acceleration.z ?? 0);
      } else {
        const r = e.accelerationIncludingGravity;
        if (!r || r.x == null) return;
        g = { x: g.x * 0.9 + (r.x ?? 0) * 0.1, y: g.y * 0.9 + (r.y ?? 0) * 0.1, z: g.z * 0.9 + (r.z ?? 0) * 0.1 }; // low-pass = gravity
        a = Math.hypot((r.x ?? 0) - g.x, (r.y ?? 0) - g.y, (r.z ?? 0) - g.z);
      }
      if (t > 500) xs.push({ t, a }); // skip settling
      if (tick && xs.length % 20 === 0) tick({ t, rms: rms(xs) });
      if (a > STEP && t > 1500) finish(t, true);
      else if (t > secs * 1000) finish(t, false);
    };
    const finish = (t: number, out: boolean) => {
      if (ended) return;
      ended = true;
      clearTimeout(guard);
      window.removeEventListener("devicemotion", on);
      res({ rms: rms(xs), peak: Math.max(0, ...xs.map((x) => x.a)), out, dead: xs.length === 0, secs: Math.round(t / 100) / 10, n: xs.length });
    };
    const guard = setTimeout(() => finish(performance.now() - t0, false), secs * 1000 + 2000); // sensor silent
    stop = () => finish(performance.now() - t0, false);
    window.addEventListener("devicemotion", on);
  });

  return { done, stop: () => stop() };
}

const rms = (xs: { a: number }[]) => (xs.length ? Math.sqrt(xs.reduce((s, x) => s + x.a * x.a, 0) / xs.length) : NaN);
