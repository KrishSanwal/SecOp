"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PROMPTS, type PromptId } from "@/lib/prompts";
import { say } from "@/lib/say";

export const btn =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed";
export const ghost = `${btn} border border-edge text-ink hover:bg-panel active:bg-rule`;
export const primary = `${btn} min-h-14 w-full bg-accent text-lg text-on-accent hover:brightness-110 active:brightness-95 disabled:bg-rule disabled:text-dim disabled:hover:brightness-100`;

export const Talk = createContext<(id: PromptId) => Promise<void>>(say);

export function Cue({ id, big }: { id: PromptId; big?: boolean }) {
  const talk = useContext(Talk);
  return (
    <div className="flex items-start gap-3">
      <p className={big ? "text-2xl leading-snug font-semibold" : "text-lg leading-relaxed"}>{PROMPTS[id]}</p>
      <button type="button" onClick={() => talk(id)} aria-label="Play this prompt again" className={`${ghost} size-12 shrink-0 px-0`}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        </svg>
      </button>
    </div>
  );
}

export function useCues(...ids: PromptId[]) {
  const talk = useContext(Talk);
  const key = ids.join(",");
  useEffect(() => {
    let live = true;
    (async () => {
      for (const id of key.split(",") as PromptId[]) {
        if (!live) return;
        await talk(id);
      }
    })();
    return () => {
      live = false;
    };
  }, [key, talk]);
}

export function Bottom({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto flex flex-col gap-2 border-t border-rule bg-cabin/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
      {children}
    </div>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Speaks `cue`, then counts `secs` down; speaks `end` and calls onDone at zero.
export function Timed(p: {
  cue?: PromptId;
  end?: PromptId;
  secs: number;
  label: string;
  onDone: () => void;
  onStart?: (t0: number) => void;
  skip?: boolean;
  children?: ReactNode;
}) {
  const talk = useContext(Talk);
  const [go, setGo] = useState(!p.cue);
  const [left, setLeft] = useState(p.secs);
  const done = useRef(p.onDone);
  const end = useRef(p.end);
  const start = useRef(p.onStart);
  useEffect(() => {
    done.current = p.onDone;
    end.current = p.end;
    start.current = p.onStart;
  });

  useEffect(() => {
    if (!p.cue) return;
    let live = true;
    talk(p.cue).then(() => live && setGo(true));
    return () => {
      live = false;
    };
  }, [p.cue, talk]);

  useEffect(() => {
    if (!go) return;
    const t0 = performance.now();
    start.current?.(t0);
    const id = setInterval(() => {
      const l = Math.max(0, p.secs - Math.floor((performance.now() - t0) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        if (end.current) talk(end.current);
        done.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [go, p.secs, talk]);

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-dim" aria-live="polite">
        {go ? `${p.label}: ${p.secs} seconds.` : "Listen…"}
      </p>
      <p className="font-mono text-[5.5rem] leading-none font-bold tabular-nums" aria-hidden>
        {clock(go ? left : p.secs)}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-200 ease-linear" style={{ width: `${go ? ((p.secs - left) / p.secs) * 100 : 0}%` }} />
      </div>
      {p.children}
      {p.skip && (
        <button type="button" onClick={() => done.current()} className={`${ghost} text-dim`}>
          Skip the wait
        </button>
      )}
    </div>
  );
}

export function Stepper(p: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; min: number; max: number; step: number; start: number }) {
  const n = parseFloat(p.value);
  const bump = (d: number) => {
    const v = Number.isFinite(n) ? n + d : p.start;
    p.onChange(String(Math.min(p.max, Math.max(p.min, Math.round(v / p.step) * p.step))));
  };
  const sq = `${btn} size-16 shrink-0 border border-edge bg-panel px-0 text-2xl hover:bg-rule active:bg-rule`;
  return (
    <div>
      <label htmlFor={p.id} className="text-lg font-semibold">
        {p.label}
      </label>
      {p.hint && <p className="text-dim">{p.hint}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => bump(-p.step)} aria-label={`Less, by ${p.step}`} className={sq}>
          −
        </button>
        <input
          id={p.id}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))}
          inputMode={p.step < 1 ? "decimal" : "numeric"}
          autoComplete="off"
          className="min-h-16 w-full min-w-0 rounded-lg border border-edge bg-panel text-center font-mono text-4xl font-bold tabular-nums focus:border-accent focus:outline-none"
        />
        <button type="button" onClick={() => bump(p.step)} aria-label={`More, by ${p.step}`} className={sq}>
          +
        </button>
      </div>
    </div>
  );
}

export function Choice<T extends string>(p: { name: string; legend: string; opts: [T, string, string?][]; value: T | null; onChange: (v: T) => void; cols?: string }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold">{p.legend}</legend>
      <div className={`mt-3 grid gap-2 ${p.cols ?? "grid-cols-3"}`}>
        {p.opts.map(([v, label, hint]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={p.name} checked={p.value === v} onChange={() => p.onChange(v)} className="peer sr-only" />
            <span className="flex min-h-16 flex-col justify-center rounded-lg border border-edge bg-panel px-3 py-2 text-center transition-colors duration-150 peer-checked:border-accent peer-checked:bg-accent/12 peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-dim active:bg-rule">
              <span className="font-semibold">{label}</span>
              {hint && <span className="text-sm text-dim">{hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
