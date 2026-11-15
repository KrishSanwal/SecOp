"use client";

import { useEffect, useMemo, useState } from "react";
import { mars, mins, packet } from "@/lib/mars";
import type { Report } from "@/lib/types";
import { ghost } from "./ui";

const TODAY = mars(new Date()); // once per page load; drifts by seconds, not minutes

export function Surgeon({ r, name, space }: { r: Report; name: string; space: boolean }) {
  const m = TODAY;
  const msg = useMemo(() => packet(name, r.exam.at, r.flags.map((f) => f.id), r.m as unknown as Record<string, number>), [r, name]);
  const [sent, setSent] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (sent == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sent]);

  const oneWay = m.oneWaySec;
  const reply = sent != null ? sent + 2 * oneWay * 1000 : null;
  const left = reply != null ? Math.max(0, reply - now) : 0;
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
  const where = space ? "the ship" : "Mars";

  async function queue() {
    const t = Date.now();
    setSent(t);
    setNow(t);
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
    } catch {}
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="mc">
      <h2 id="mc" className="text-xl font-semibold">
        Message the flight surgeon
      </h2>
      <p className="text-dim">
        Today Earth is {Math.round(m.km / 1e6)} million km from {where}. A message takes {mins(oneWay)} each way, so the earliest reply is {mins(2 * oneWay)} after you send.
        That is why the actions above come first.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-panel p-3 text-sm whitespace-pre-wrap">{msg}</pre>
      <p className="text-sm text-dim">{msg.length} characters. Fits one text message or a thin emergency link.</p>
      {sent == null ? (
        <button type="button" onClick={queue} className={ghost}>
          Queue for the next comms window
        </button>
      ) : (
        <div className="rounded-lg border border-edge p-4" role="status">
          <p className="text-sm text-dim">Queued {new Date(sent).toLocaleTimeString()}{copied ? ", copied to clipboard" : ""}</p>
          <p className="text-3xl font-bold tabular-nums">{left > 0 ? mmss(left) : "Reply window open"}</p>
          <p className="text-dim">{left > 0 ? "until the earliest possible reply. Carry on with the actions above." : "The surgeon could answer now."}</p>
        </div>
      )}
    </section>
  );
}
