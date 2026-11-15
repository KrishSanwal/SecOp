import { afterEach, describe, expect, it, vi } from "vitest";
import { uid } from "./db";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses randomUUID when the page is secure", () => {
    expect(uid()).toMatch(V4);
  });

  it("still makes unique v4 ids on plain http, where randomUUID is missing", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => real.getRandomValues(a) });
    const ids = new Set(Array.from({ length: 200 }, uid));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(V4);
  });
});
