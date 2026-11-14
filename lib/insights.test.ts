import { describe, expect, it } from "vitest";
import { insights, series } from "./insights";
import type { Exam, Results } from "./types";

const base: Results = {
  pupils: { l: "brisk", r: "brisk" },
  hr: { sit: 17, stand: 20 },
  bal: { sway: "none", secs: 30 },
  mood: { sleep: 7, score: 4, note: "" },
  rx: { ms: Array(10).fill(300) },
};
let n = 0;
const ex = (day: number, rx: number, sleep = 7): Exam => ({
  id: `i${n++}`, subj: "a", exr: "b", at: day * 864e5,
  res: { ...base, mood: { ...base.mood, sleep }, rx: { ms: Array(10).fill(rx) } },
});

describe("insights", () => {
  it("spots a three-exam worsening streak", () => {
    const t = insights([ex(1, 300), ex(2, 310), ex(3, 340), ex(4, 380)]);
    expect(t[0]).toMatch(/Reaction has got worse three exams in a row/);
  });
  it("links short sleep to slower reactions", () => {
    const t = insights([ex(1, 300, 8), ex(2, 300, 7.5), ex(3, 360, 5), ex(4, 300, 7), ex(5, 355, 5.5)]);
    expect(t.join(" ")).toMatch(/under 6 h of sleep, reactions are \d+% slower/);
  });
  it("says nothing with too little history", () => {
    expect(insights([ex(1, 300), ex(2, 400)])).toEqual([]);
  });
  it("series skips unmeasured values", () => {
    expect(series([ex(1, 300), ex(2, 320)]).brms).toEqual([]);
    expect(series([ex(1, 300), ex(2, 320)]).rx.length).toBe(2);
  });
});
