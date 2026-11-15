import { describe, expect, it } from "vitest";
import { mars, packet } from "./mars";

describe("mars", () => {
  it("stays inside the physical range", () => {
    for (let y = 2024; y <= 2030; y++)
      for (let mo = 0; mo < 12; mo += 3) {
        const { au } = mars(new Date(Date.UTC(y, mo, 1)));
        expect(au).toBeGreaterThan(0.36);
        expect(au).toBeLessThan(2.7);
      }
  });
  it("is near its minimum at the Feb 2027 opposition", () => {
    const opp = mars(new Date(Date.UTC(2027, 1, 19))).au;
    const before = mars(new Date(Date.UTC(2026, 5, 1))).au;
    const after = mars(new Date(Date.UTC(2027, 10, 1))).au;
    expect(opp).toBeLessThan(0.75);
    expect(opp).toBeLessThan(before);
    expect(opp).toBeLessThan(after);
  });
  it("light time matches distance", () => {
    const { km, oneWaySec } = mars(new Date(Date.UTC(2026, 10, 15)));
    expect(oneWaySec).toBeCloseTo(km / 299792.458, 3);
    expect(oneWaySec / 60).toBeGreaterThan(3);
    expect(oneWaySec / 60).toBeLessThan(23);
  });
});

describe("packet", () => {
  it("fits in a text message", () => {
    const p = packet("Asha", Date.UTC(2026, 10, 15, 9, 30), ["pupil_slow", "hr_high", "rx_slow"], { hr: 36, rx: 384, sleep: 5, mood: 3, pupil: 1, bal: 1 });
    expect(p.length).toBeLessThan(160);
    expect(p).toContain("FLAGS pupil_slow,hr_high,rx_slow");
    expect(p).toContain("hr+36");
  });
});
