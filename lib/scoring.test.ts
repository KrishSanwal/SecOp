import { describe, expect, it } from "vitest";
import { baseline, flags, median, metrics, report } from "./scoring";
import type { Exam, Results } from "./types";

const ok: Results = {
  pupils: { l: "brisk", r: "brisk" },
  hr: { sit: 17, stand: 20 },
  bal: { sway: "none", secs: 30 },
  mood: { sleep: 7.5, score: 4, note: "" },
  rx: { ms: [300, 310, 290, 305, 295, 300, 315, 285, 300, 310] },
};

let n = 0;
const ex = (res: Partial<Results>, day: number): Exam => ({
  id: `e${n++}`,
  subj: "a",
  exr: "b",
  at: day * 86_400_000,
  res: { ...ok, ...res },
});

const ids = (fs: { id: string }[]) => fs.map((f) => f.id);

describe("median", () => {
  it("odd, even, junk", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([0, -5, NaN, 10])).toBe(10);
    expect(median([])).toBeNaN();
  });
});

describe("metrics", () => {
  it("15 s counts to bpm", () => expect(metrics(ex({}, 0)).hr).toBe(12));
  it("pupil points", () => expect(metrics(ex({ pupils: { l: "sluggish", r: "unequal" } }, 0)).pupil).toBe(3));
});

describe("baseline", () => {
  it("null under 2 exams", () => expect(baseline([ex({}, 0)])).toBeNull());
  it("first 2 by time", () => {
    const b = baseline([
      ex({ mood: { sleep: 9, score: 5, note: "" } }, 5),
      ex({ mood: { sleep: 7, score: 3, note: "" } }, 1),
      ex({ mood: { sleep: 8, score: 4, note: "" } }, 2),
    ]);
    expect(b?.sleep).toBe(7.5);
    expect(b?.mood).toBe(3.5);
  });
});

describe("flags", () => {
  it("none when normal", () => expect(flags(ex({}, 3), null, null)).toEqual([]));
  it("unequal beats sluggish", () => {
    expect(ids(flags(ex({ pupils: { l: "sluggish", r: "unequal" } }, 3), null, null))).toEqual(["pupil_uneq"]);
  });
  it("hr above 30, not at 30", () => {
    expect(ids(flags(ex({ hr: { sit: 15, stand: 23 } }, 3), null, null))).toContain("hr_high");
    expect(flags(ex({ hr: { sit: 15, stand: 22.5 } }, 3), null, null)).toEqual([]);
  });
  it("stepped out", () => {
    expect(flags(ex({ bal: { sway: "out", secs: 12 } }, 3), null, null)[0].msg).toContain("12 s");
  });
  it("sleep needs two in a row", () => {
    const short = { mood: { sleep: 5, score: 4 as const, note: "" } };
    expect(flags(ex(short, 3), null, ex({}, 2))).toEqual([]);
    expect(ids(flags(ex(short, 3), null, ex(short, 2)))).toEqual(["sleep_low"]);
  });
  it("rx only with baseline", () => {
    const slow = { rx: { ms: Array(10).fill(400) } };
    expect(flags(ex(slow, 3), null, null)).toEqual([]);
    expect(ids(flags(ex(slow, 3), metrics(ex({}, 0)), null))).toEqual(["rx_slow"]);
  });
});

describe("report", () => {
  it("baseline from prior exams, delta, flags", () => {
    const e1 = ex({}, 1);
    const e2 = ex({}, 2);
    const d = ex({ hr: { sit: 17, stand: 27 }, rx: { ms: Array(10).fill(380) } }, 10);
    const r = report(d, [d, e2, e1]);
    expect(r.delta?.hr).toBe(28);
    expect(ids(r.flags).sort()).toEqual(["hr_high", "rx_slow"]);
  });
  it("no baseline on first exam", () => {
    const e1 = ex({}, 1);
    expect(report(e1, [e1]).base).toBeNull();
  });
});
