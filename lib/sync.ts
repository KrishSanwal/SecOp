import type { Crew, Exam } from "./types";

// Records move phone to phone as a loop of QR frames. No network. Frame: SO1|z|index|total|payload
export const CHUNK = 500;
const HEAD = "SO1";

export type Bundle = { crew: Crew[]; exams: Exam[] };

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pipe(u: Uint8Array, s: ReadableWritablePair<Uint8Array, BufferSource>) {
  const r = new Blob([u as BlobPart]).stream().pipeThrough(s);
  return new Uint8Array(await new Response(r).arrayBuffer());
}

export async function encode(b: Bundle): Promise<string[]> {
  const raw = new TextEncoder().encode(JSON.stringify(b));
  let z = "0", body = raw;
  if (typeof CompressionStream !== "undefined") {
    body = await pipe(raw, new CompressionStream("deflate-raw"));
    z = "1";
  }
  const text = b64(body);
  const n = Math.max(1, Math.ceil(text.length / CHUNK));
  return Array.from({ length: n }, (_, i) => `${HEAD}|${z}|${i}|${n}|${text.slice(i * CHUNK, (i + 1) * CHUNK)}`);
}

export class Receiver {
  parts = new Map<number, string>();
  total = 0;
  z = "0";

  take(s: string): boolean {
    const m = /^SO1\|([01])\|(\d+)\|(\d+)\|([A-Za-z0-9+/=]+)$/.exec(s.trim());
    if (!m) return false;
    const [, z, i, n, data] = m;
    if (this.total && this.total !== +n) this.parts.clear();
    this.total = +n;
    this.z = z;
    this.parts.set(+i, data);
    return true;
  }

  get have() {
    return this.parts.size;
  }

  get done() {
    return this.total > 0 && this.parts.size === this.total;
  }

  async bundle(): Promise<Bundle> {
    const text = Array.from({ length: this.total }, (_, i) => this.parts.get(i) ?? "").join("");
    let body = unb64(text);
    if (this.z === "1") {
      if (typeof DecompressionStream === "undefined") throw new Error("This browser can't unpack the transfer. Try Chrome or Safari.");
      body = await pipe(body, new DecompressionStream("deflate-raw"));
    }
    const b = JSON.parse(new TextDecoder().decode(body)) as Bundle;
    if (!Array.isArray(b.crew) || !Array.isArray(b.exams)) throw new Error("Not a SecOp transfer.");
    return b;
  }
}
