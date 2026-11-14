"use client";

import { ArrowLeft, Minus, Plus, SpeakerHigh } from "@phosphor-icons/react";
import Link from "next/link";
import { Children, createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PROMPTS, type PromptId } from "@/lib/prompts";
import { say } from "@/lib/say";

export const btn =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[3px] px-4 font-semibold transition-colors duration-150 disabled:cursor-not-allowed";
export const ghost = `${btn} border border-edge text-ink hover:border-accent hover:text-accent active:bg-rule`;
export const primary = `${btn} cut glow min-h-14 w-full bg-accent text-center font-display text-lg tracking-wide text-on-accent uppercase hover:brightness-105 active:brightness-95 disabled:bg-rule disabled:text-dim disabled:shadow-none`;

export const Talk = createContext<(id: PromptId) => Promise<boolean>>(say);

export function Tag({ children, tone = "dim" }: { children: ReactNode; tone?: "dim" | "accent" | "alert" }) {
  const c = { dim: "text-dim", accent: "text-accent", alert: "text-alert" }[tone];
  return (
    <p className={`font-mono text-xs tracking-[0.14em] uppercase ${c}`}>
      <span aria-hidden>{"// "}</span>
      {children}
    </p>
  );
}

export function Back({ href, onClick, label = "Back" }: { href?: string; onClick?: () => void; label?: string }) {
  const cls = `${btn} -ml-3 self-start px-3 text-dim hover:text-accent`;
  const body = (
    <>
      <ArrowLeft size={20} weight="bold" aria-hidden />
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

export function Cue({ id, big }: { id: PromptId; big?: boolean }) {
  const talk = useContext(Talk);
  return (
    <div className="flex items-start gap-3">
      <p className={big ? "font-display text-2xl leading-snug font-semibold text-chalk" : "text-lg leading-relaxed"}>{PROMPTS[id]}</p>
      <button type="button" onClick={() => talk(id)} aria-label="Play this prompt again" className={`${ghost} size-12 shrink-0 px-0`}>
        <SpeakerHigh size={20} weight="bold" aria-hidden />
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
        if (!live || !(await talk(id))) return;
      }
    })();
    return () => {
      live = false;
    };
  }, [key, talk]);
}

export function Bottom({ children }: { children: ReactNode }) {
  if (!Children.toArray(children).length) return null;
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-auto flex flex-col gap-2 border-t border-rule bg-cabin/90 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
      {children}
    </div>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Big({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[5.5rem] leading-none font-bold tracking-tight text-chalk tabular-nums">{children}</p>;
}

export function Bar({ f }: { f: number }) {
  return (
    <div className="h-1.5 w-full bg-rule" aria-hidden>
      <div className="h-full bg-accent shadow-[0_0_12px_rgb(242_255_61/0.6)] transition-[width] duration-200 ease-linear" style={{ width: `${Math.min(1, Math.max(0, f)) * 100}%` }} />
    </div>
  );
}

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
      {p.cue && <p className="font-display text-2xl leading-snug font-semibold text-chalk">{PROMPTS[p.cue]}</p>}
      <p className="text-dim" aria-live="polite">
        {go ? `${p.label}: ${p.secs} seconds.` : "Listen…"}
      </p>
      <div aria-hidden>
        <Big>{clock(go ? left : p.secs)}</Big>
      </div>
      <Bar f={go ? (p.secs - left) / p.secs : 0} />
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
  const sq = `${btn} size-16 shrink-0 border border-edge bg-panel px-0 hover:border-accent hover:text-accent active:bg-rule`;
  return (
    <div>
      <label htmlFor={p.id} className="text-lg font-semibold text-chalk">
        {p.label}
      </label>
      {p.hint && <p className="text-dim">{p.hint}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => bump(-p.step)} aria-label={`Less, by ${p.step}`} className={sq}>
          <Minus size={24} weight="bold" aria-hidden />
        </button>
        <input
          id={p.id}
          value={p.value}
          onChange={(e) => p.onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 4))}
          inputMode={p.step < 1 ? "decimal" : "numeric"}
          autoComplete="off"
          className="min-h-16 w-full min-w-0 rounded-[3px] border border-edge bg-panel text-center font-mono text-4xl font-bold text-chalk tabular-nums focus:border-accent focus:outline-none"
        />
        <button type="button" onClick={() => bump(p.step)} aria-label={`More, by ${p.step}`} className={sq}>
          <Plus size={24} weight="bold" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export const tile =
  "rounded-[3px] border border-edge bg-panel transition-colors duration-150 peer-checked:hud peer-checked:border-accent peer-checked:bg-accent/10 peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-dim active:bg-rule";

export function Choice<T extends string>(p: { name: string; legend: string; opts: [T, string, string?][]; value: T | null; onChange: (v: T) => void; cols?: string }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-chalk">{p.legend}</legend>
      <div className={`mt-3 grid gap-2 ${p.cols ?? "grid-cols-3"}`}>
        {p.opts.map(([v, label, hint]) => (
          <label key={v} className="cursor-pointer">
            <input type="radio" name={p.name} checked={p.value === v} onChange={() => p.onChange(v)} className="peer sr-only" />
            <span className={`flex min-h-16 flex-col justify-center px-3 py-2 text-center ${tile}`}>
              <span className="font-semibold">{label}</span>
              {hint && <span className="text-sm text-dim">{hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
