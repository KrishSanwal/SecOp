import { describe, expect, it } from "vitest";
import { META } from "./meta";

const fmt = (k: string, v: number) => META.find((m) => m.k === k)!.fmt(v);

describe("hours and minutes", () => {
  it("never shows 60 minutes", () => {
    expect(fmt("slp", 419.7)).toBe("7 h 00 min");
    expect(fmt("sed", 539.6)).toBe("9 h 00 min");
  });
  it("keeps normal values", () => {
    expect(fmt("slp", 356)).toBe("5 h 56 min");
    expect(fmt("slp", 0)).toBe("0 h 00 min");
  });
});
