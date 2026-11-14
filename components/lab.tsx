"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

export function Page({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 pt-4 pb-10">
      <Link href="/lab" className="flex min-h-11 w-fit items-center gap-1 text-dim hover:text-foreground">
        <span aria-hidden>←</span> Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-dim">{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** Tick-off list. Calls onAll when every item is ticked. */
export function Prep({ items, onAll }: { items: string[]; onAll: () => void }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const all = done.every(Boolean);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Before you start</h2>
      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {items.map((t, i) => (
          <li key={t}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={done[i]}
                onChange={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
                className="size-5 accent-[var(--accent)]"
              />
              <span className={done[i] ? "text-dim line-through" : ""}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" disabled={!all} onClick={onAll} className="min-h-12 rounded-lg bg-accent font-semibold text-cabin disabled:bg-panel disabled:text-dim">
        {all ? "I'm ready" : `Tick all ${items.length} to continue`}
      </button>
    </section>
  );
}

/** Live readiness: shows only the first thing to fix, or that it is ready. */
export function Status({ checks, count }: { checks: { ok: boolean; fix: string }[]; count?: number | null }) {
  const bad = checks.find((c) => !c.ok);
  return (
    <div className={`rounded-lg border p-4 ${bad ? "border-edge" : "border-accent"}`} role="status" aria-live="polite">
      {bad ? (
        <>
          <p className="text-sm text-dim">Not ready yet</p>
          <p className="text-lg font-semibold">{bad.fix}</p>
        </>
      ) : (
        <>
          <p className="text-sm text-accent">Ready</p>
          <p className="text-lg font-semibold">{count != null ? `Starting in ${count}…` : "Hold still"}</p>
        </>
      )}
      <p className="mt-2 text-sm text-dim">
        {checks.filter((c) => c.ok).length} of {checks.length} checks passed
      </p>
    </div>
  );
}

export type Tone = "ok" | "check" | "fail";

export function Verdict({ tone, title, body, nums, again }: { tone: Tone; title: string; body: string; nums?: [string, string][]; again: () => void }) {
  const c = { ok: "border-accent", check: "border-alert", fail: "border-edge" }[tone];
  const h = { ok: "text-accent", check: "text-alert", fail: "text-foreground" }[tone];
  return (
    <section className={`flex flex-col gap-3 rounded-lg border-l-4 bg-panel p-4 ${c}`}>
      <p className={`text-xl font-semibold ${h}`}>{title}</p>
      <p>{body}</p>
      {nums && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {nums.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-dim">{k}</dt>
              <dd className="text-right tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <button type="button" onClick={again} className="min-h-12 rounded-lg border border-edge font-semibold hover:border-dim">
        Test again
      </button>
      <p className="text-xs text-dim">A rough guide for a prototype, not a diagnosis. In the real exam, results are compared with your own past sessions.</p>
    </section>
  );
}

let ac: AudioContext | null = null;
/** Short tone, for steps done with eyes closed. */
export function beep(hz = 880, ms = 180) {
  try {
    ac ??= new AudioContext();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.value = hz;
    g.gain.value = 0.15;
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + ms / 1000);
  } catch {}
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
