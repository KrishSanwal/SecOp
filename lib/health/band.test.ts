import { describe, expect, it } from "vitest";
import { bandHr } from "./band";
import { beatsOf, type Beat } from "./map";

const every = (a: number, b: number, gap: number, bpm: number): Beat[] => Array.from({ length: Math.floor((b - a) / gap) }, (_, i) => ({ t: a + i * gap, bpm }));

describe("bandHr", () => {
  it("averages the last 30 s of sitting and of standing", () => {
    const pts = [...every(0, 30_000, 5000, 90), ...every(30_000, 60_000, 5000, 70), ...every(60_000, 135_000, 5000, 95)];
    expect(bandHr(pts, [0, 60_000], [60_000, 135_000])).toEqual({ sit: 70, stand: 95 });
  });

  it("falls back to the whole phase when the band logged sparsely", () => {
    const pts = [{ t: 10_000, bpm: 68 }, { t: 70_000, bpm: 92 }];
    expect(bandHr(pts, [0, 60_000], [60_000, 135_000])).toEqual({ sit: 68, stand: 92 });
  });

  it("gives NaN for a phase the band has not synced yet", () => {
    const r = bandHr(every(0, 60_000, 5000, 72), [0, 60_000], [60_000, 135_000]);
    expect(r.sit).toBe(72);
    expect(r.stand).toBeNaN();
  });
});

describe("beatsOf", () => {
  it("reads Google Health heart-rate points, string bpm, sorted, junk dropped", () => {
    const p = (t: string, bpm: unknown) => ({ heartRate: { sampleTime: { physicalTime: t, utcOffset: "0s" }, beatsPerMinute: bpm, metadata: { sensorLocation: "WRIST" } } });
    expect(beatsOf([p("2026-11-15T10:00:05Z", "74"), p("2026-11-15T10:00:00Z", "72"), p("bad", "70"), p("2026-11-15T10:00:10Z", "999"), {}])).toEqual([
      { t: Date.parse("2026-11-15T10:00:00Z"), bpm: 72 },
      { t: Date.parse("2026-11-15T10:00:05Z"), bpm: 74 },
    ]);
  });
});
