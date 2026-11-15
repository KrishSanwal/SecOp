import { describe, expect, it } from "vitest";
import { digest, flags, usual, verdict } from "./base";
import { demo } from "./demo";
import type { Day } from "./types";

const NOW = Date.UTC(2026, 10, 15, 12);
const steady = (n: number, f: Partial<Day> = {}): Day[] =>
  Array.from({ length: n }, (_, i) => ({ d: `2026-10-${String(i + 1).padStart(2, "0")}`, rhr: 58, shr: 51, hrv: 60, slp: 450, spo2: 96.5, rr: 14.5, tmp: 0, ...f }));

describe("usual", () => {
  it("needs five days", () => {
    expect(usual(steady(4), "rhr")).toBeNull();
    expect(usual(steady(5), "rhr")).toBe(58);
  });
  it("uses only the last 14 days", () => {
    const xs = [...steady(10, { rhr: 80 }), ...steady(14, { rhr: 60 })];
    expect(usual(xs, "rhr")).toBe(60);
  });
  it("skips missing values", () => {
    const xs = steady(8);
    delete xs[2].rhr;
    expect(usual(xs, "rhr")).toBe(58);
  });
});

describe("flags", () => {
  it("is quiet when steady", () => {
    expect(flags(steady(20))).toEqual([]);
  });
  it("flags rising resting HR and falling HRV together", () => {
    const xs = [...steady(18), { ...steady(1)[0], d: "2026-10-19", rhr: 68, hrv: 40 }];
    expect(flags(xs).map((f) => f.id)).toEqual(["rhr_up", "hrv_low"]);
  });
  it("flags two short nights, not one", () => {
    const one = [...steady(18), { ...steady(1)[0], d: "2026-10-19", slp: 300 }];
    expect(flags(one).some((f) => f.id === "slp_low")).toBe(false);
    const two = [...one, { ...steady(1)[0], d: "2026-10-20", slp: 320 }];
    expect(flags(two).some((f) => f.id === "slp_low")).toBe(true);
  });
  it("flags low oxygen with no history", () => {
    expect(flags(steady(2, { spo2: 90 })).map((f) => f.id)).toContain("spo2_low");
  });
  it("flags a rhythm alert today", () => {
    expect(flags([...steady(6), { ...steady(1)[0], d: "2026-10-07", irn: 1 }]).map((f) => f.id)).toContain("irn");
  });
  it("ignores stale readings", () => {
    const xs = [...steady(18), { d: "2026-10-19", rhr: 80 }, { d: "2026-10-20" }, { d: "2026-10-21" }, { d: "2026-10-22" }];
    expect(flags(xs).some((f) => f.id === "rhr_up")).toBe(false);
  });
});

describe("verdict", () => {
  it("handles no data", () => {
    expect(verdict([], []).t).toBe("Could not measure");
  });
  it("says normal and recheck", () => {
    const ok = steady(20);
    expect(verdict(ok, flags(ok)).t).toBe("Looks normal");
    const bad = [...ok, { ...ok[0], d: "2026-10-21", rhr: 70, shr: 62, hrv: 35 }];
    const v = verdict(bad, flags(bad));
    expect(v.t).toBe("Worth a recheck");
    expect(v.why).toMatch(/Several/);
  });
});

describe("digest", () => {
  it("pairs each value with usual", () => {
    const d = digest(steady(10));
    const r = d.find((x) => x.k === "rhr")!;
    expect(r.v).toBe("58 bpm");
    expect(r.usual).toBe("58 bpm");
  });
});

describe("demo", () => {
  it("is deterministic and dated", () => {
    const a = demo("x", false, 30, NOW);
    expect(a).toEqual(demo("x", false, 30, NOW));
    expect(a).toHaveLength(30);
    expect(a.at(-1)!.d).toBe("2026-11-15");
  });
  it("drift trips the recovery flags and steady does not", () => {
    expect(flags(demo("x", true, 30, NOW)).length).toBeGreaterThanOrEqual(3);
    expect(flags(demo("x", false, 30, NOW))).toEqual([]);
  });
});
