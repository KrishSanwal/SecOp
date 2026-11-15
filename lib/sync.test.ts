import { describe, expect, it } from "vitest";
import { CHUNK, encode, Receiver } from "./sync";
import type { Exam } from "./types";

const ex = (i: number): Exam => ({
  id: `e${i}`, subj: "a", exr: "b", at: i * 864e5,
  res: { pupils: { l: "brisk", r: "brisk", lat: 250 + i, con: 0.3, curve: Array(30).fill(0.9) }, hr: { sit: 17, stand: 20 }, bal: { sway: "none", secs: 30, rms: 0.12 }, mood: { sleep: 7, score: 4, note: "fine" }, rx: { ms: Array(10).fill(300 + i) } },
});

describe("sync", () => {
  it("round-trips a crew member with 12 exams in a handful of frames, any order", async () => {
    const b = { crew: [{ id: "a", name: "Asha", role: "Commander" }], exams: Array.from({ length: 12 }, (_, i) => ex(i)) };
    const frames = await encode(b);
    expect(frames.length).toBeLessThan(12);
    for (const f of frames) expect(f.length).toBeLessThan(CHUNK + 20);
    const r = new Receiver();
    expect(r.take("https://example.com")).toBe(false);
    for (const f of [...frames].reverse()) r.take(f);
    r.take(frames[0]);
    expect(r.done).toBe(true);
    expect(await r.bundle()).toEqual(b);
  });
  it("reports progress", async () => {
    const frames = await encode({ crew: [], exams: Array.from({ length: 20 }, (_, i) => ex(i)) });
    const r = new Receiver();
    r.take(frames[1]);
    expect(r.have).toBe(1);
    expect(r.total).toBe(frames.length);
    expect(r.done).toBe(false);
  });
});
