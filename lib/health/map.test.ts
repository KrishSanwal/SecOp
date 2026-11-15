import { describe, expect, it } from "vitest";
import { civil, fold, local, num } from "./map";

describe("helpers", () => {
  it("parses int64 strings", () => {
    expect(num("72")).toBe(72);
    expect(num("x")).toBeUndefined();
    expect(num(null)).toBeUndefined();
  });
  it("builds civil dates", () => {
    expect(civil({ year: 2026, month: 11, day: 5 })).toBe("2026-11-05");
    expect(civil({})).toBeUndefined();
  });
  it("applies utc offsets", () => {
    expect(local("2026-11-15T02:00:00Z", "-14400s")).toBe("2026-11-14");
    expect(local("2026-11-15T20:00:00Z", "19800s")).toBe("2026-11-16");
    expect(local("nope", "0s")).toBeUndefined();
  });
});

describe("fold", () => {
  it("merges daily types onto one day", () => {
    const d = { year: 2026, month: 11, day: 14 };
    const out = fold({
      "daily-resting-heart-rate": [{ dailyRestingHeartRate: { date: d, beatsPerMinute: "58" } }],
      "daily-heart-rate-variability": [{ dailyHeartRateVariability: { date: d, averageHeartRateVariabilityMilliseconds: 61.2, nonRemHeartRateBeatsPerMinute: "50" } }],
      "daily-oxygen-saturation": [{ dailyOxygenSaturation: { date: d, averagePercentage: 96.4 } }],
      "daily-respiratory-rate": [{ dailyRespiratoryRate: { date: d, breathsPerMinute: 14.2 } }],
      "daily-sleep-temperature-derivations": [{ dailySleepTemperatureDerivations: { date: d, baselineTemperatureCelsius: 33.1, nightlyTemperatureCelsius: 33.6 } }],
      "daily-vo2-max": [{ dailyVo2Max: { date: d, vo2Max: 44.5 } }],
    });
    expect(out).toEqual([{ d: "2026-11-14", rhr: 58, hrv: 61.2, shr: 50, spo2: 96.4, rr: 14.2, tmp: 0.5, vo2: 44.5 }]);
  });

  it("reads a sleep session and its stages", () => {
    const out = fold({
      sleep: [
        {
          sleep: {
            interval: { startTime: "2026-11-14T22:00:00Z", endTime: "2026-11-15T06:00:00Z", endUtcOffset: "0s" },
            stages: [
              { startTime: "2026-11-14T22:00:00Z", endTime: "2026-11-14T23:30:00Z", type: "LIGHT" },
              { startTime: "2026-11-14T23:30:00Z", endTime: "2026-11-15T00:30:00Z", type: "DEEP" },
              { startTime: "2026-11-15T00:30:00Z", endTime: "2026-11-15T01:30:00Z", type: "REM" },
            ],
            summary: { minutesAsleep: "455" },
          },
        },
      ],
    });
    expect(out).toEqual([{ d: "2026-11-15", slp: 455, deep: 60, rem: 60 }]);
  });

  it("sums intervals by local day", () => {
    const iv = (t: string) => ({ startTime: t, endTime: t, startUtcOffset: "0s" });
    const out = fold({
      steps: [
        { steps: { interval: iv("2026-11-14T10:00:00Z"), count: "120" } },
        { steps: { interval: iv("2026-11-14T11:00:00Z"), count: "80" } },
        { steps: { interval: iv("2026-11-15T01:00:00Z"), count: "5" } },
      ],
      "irregular-rhythm-notification": [{ irregularRhythmNotification: { interval: iv("2026-11-14T03:00:00Z") } }],
      "sedentary-period": [{ sedentaryPeriod: { interval: { startTime: "2026-11-14T10:00:00Z", endTime: "2026-11-14T11:30:00Z", startUtcOffset: "0s" } } }],
    });
    expect(out).toEqual([
      { d: "2026-11-14", stp: 200, irn: 1, sed: 90 },
      { d: "2026-11-15", stp: 5 },
    ]);
  });

  it("survives junk and empty input", () => {
    expect(fold({})).toEqual([]);
    expect(fold({ steps: [null, 4, {}, { steps: { count: "x" } }], sleep: [{ sleep: { summary: {} } }] })).toEqual([]);
  });
});
