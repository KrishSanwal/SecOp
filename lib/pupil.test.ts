import { describe, expect, it } from "vitest";
import { reflex, segment, type Frame } from "./pupil";

const S = 96;

function eye(p: number, iris: [number, number, number], pupil: [number, number, number], o: { glint?: boolean; lid?: boolean; noise?: number } = {}) {
  const d = new Uint8ClampedArray(S * S * 4);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const r = Math.hypot(x - S / 2, y - S / 2);
      let c = r < p ? pupil : iris;
      if (o.glint && Math.hypot(x - S / 2 - 4, y - S / 2 - 4) < 3) c = [250, 250, 250];
      if (o.lid && y < 14) c = [20, 15, 15];
      const n = o.noise ? (((x * 31 + y * 17) % 7) - 3) * o.noise : 0;
      d[i] = c[0] + n; d[i + 1] = c[1] + n; d[i + 2] = c[2] + n; d[i + 3] = 255;
    }
  return d;
}

const BROWN: [number, number, number] = [72, 40, 28];
const BLACK: [number, number, number] = [22, 20, 20];

describe("segment", () => {
  it("measures pupil size on a dark brown iris", () => {
    const big = segment(eye(20, BROWN, BLACK, { noise: 1 }), S);
    const small = segment(eye(12, BROWN, BLACK, { noise: 1 }), S);
    expect(Math.sqrt(big.frac) * 0.85).toBeGreaterThan(Math.sqrt(small.frac) * 0.85 + 0.1);
    expect(big.sep).toBeGreaterThan(0.3);
  });
  it("counts a flash glint inside the pupil as pupil", () => {
    const a = segment(eye(16, BROWN, BLACK), S).frac;
    const b = segment(eye(16, BROWN, BLACK, { glint: true }), S).frac;
    expect(Math.abs(a - b) / a).toBeLessThan(0.1);
  });
  it("ignores a dark eyelid shadow that is not connected to the pupil", () => {
    const a = segment(eye(14, BROWN, BLACK), S).frac;
    const b = segment(eye(14, BROWN, BLACK, { lid: true }), S).frac;
    expect(Math.abs(a - b) / a).toBeLessThan(0.15);
  });
  it("reports low separation when iris and pupil look the same", () => {
    expect(segment(eye(16, [28, 24, 22], [26, 22, 20], { noise: 1 }), S).sep).toBeLessThan(0.12);
  });
});

describe("reflex", () => {
  const run = (shrink: number, latMs: number): Frame[] => {
    const fs: Frame[] = [];
    for (let t = 0; t < 4000; t += 33) {
      const after = t - 1500 - latMs;
      const r = after < 0 ? 0.5 : 0.5 * (1 - shrink * Math.min(1, after / 600));
      fs.push({ t, ratio: r, irisPx: 40, face: true, open: 1, lum: 80, cx: 0, cy: 0, sep: 0.4 });
    }
    return fs;
  };
  it("finds latency and constriction", () => {
    const r = reflex(run(0.3, 250), 1500);
    expect(r.ok).toBe(true);
    expect(r.con).toBeGreaterThan(0.25);
    expect(r.lat).toBeGreaterThan(200);
    expect(r.lat).toBeLessThan(400);
  });
});
