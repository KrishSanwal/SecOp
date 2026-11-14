import { describe, expect, it } from "vitest";
import { analyse } from "./ppg";

const fake = (bpm: number, secs = 15, fps = 30, noise = 0.3, on = true) =>
  Array.from({ length: secs * fps }, (_, i) => {
    const t = (i / fps) * 1000;
    const beat = Math.sin((2 * Math.PI * bpm * t) / 60000);
    const drift = 5 * Math.sin(t / 4000);
    return { t, v: 200 + drift - 3 * Math.max(0, beat) ** 3 + noise * (((i * 7919) % 13) / 13 - 0.5), on };
  });

describe("analyse", () => {
  for (const bpm of [55, 72, 100, 130]) {
    it(`finds ${bpm} bpm within 4`, () => {
      expect(Math.abs(analyse(fake(bpm)).bpm - bpm)).toBeLessThan(4);
    });
  }
  it("no finger, no answer", () => {
    const r = analyse(fake(72, 15, 30, 0.3, false));
    expect(r.bpm).toBeNaN();
    expect(r.q).toBe(0);
  });
});
