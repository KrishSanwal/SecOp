"use client";

import { useSearchParams } from "next/navigation";
import { flags, latest, usual } from "@/lib/health/base";
import { byK } from "@/lib/health/meta";
import { Back } from "../ui";
import { Line } from "./line";
import { useWear } from "./use";

export default function Detail() {
  const q = useSearchParams();
  const id = q.get("crew");
  const k = q.get("m") ?? "";
  const w = useWear(id);
  const m = byK[k];

  if (!id || !m) return <p role="alert" className="text-alert">No reading selected.</p>;
  if (!w.pull) return w.err ? <p role="alert" className="text-alert">{w.err}</p> : <p className="text-dim">Loading…</p>;

  const days = w.pull.days;
  const l = m.k === "irn" ? { v: days.at(-1)?.irn ?? 0, i: days.length - 1 } : latest(days, m.k);
  const base = l ? usual(days.slice(0, l.i), m.k) : null;
  const hit = flags(days).find((f) => f.k === m.k);
  const name = w.crew?.name ?? "Crew member";
  const diff = l && base != null ? l.v - base : null;
  const recent = m.k === "irn" ? [] : days.slice(-14).reverse().filter((d) => typeof d[m.k] === "number");

  return (
    <>
      <header className="flex flex-col gap-2">
        <Back href={`/wearables?crew=${encodeURIComponent(id)}`} label={name} />
        <h1 className="text-[2.5rem] leading-[1.05] font-bold">{m.t}</h1>
      </header>

      {l ? (
        <section className="flex flex-col gap-2" aria-label="Latest reading">
          <p className="font-mono text-4xl font-bold text-chalk tabular-nums">{m.fmt(l.v)}</p>
          <p className="font-mono text-dim">
            {base != null ? `Usual ${m.fmt(base)}` : "No usual yet"}
            {diff != null && Math.abs(diff) > 1e-9 ? `. ${m.fmt(Math.abs(diff))} ${diff > 0 ? "above" : "below"} usual.` : base != null ? ". Same as usual." : "."}
          </p>
          <p className="font-mono text-sm text-dim">{m.worse > 0 ? "Lower is better" : "Higher is better"}</p>
          {hit && <p className="rounded-lg border border-alert/60 bg-panel p-3 text-alert">Worth a recheck. {hit.msg}</p>}
        </section>
      ) : (
        <p className="text-dim">No reading yet. Wear it overnight and sync.</p>
      )}

      {m.k !== "irn" && (
        <section className="flex flex-col gap-2" aria-labelledby="chart">
          <h2 id="chart" className="text-xl font-semibold">Last 30 days</h2>
          <Line days={days} k={m.k} big />
          <p className="flex justify-between font-mono text-sm text-dim">
            <span>{days[0]?.d}</span>
            <span>{days.at(-1)?.d}</span>
          </p>
        </section>
      )}

      <section className="flex flex-col gap-2" aria-labelledby="means">
        <h2 id="means" className="text-xl font-semibold">What this means</h2>
        <p className="text-lg leading-relaxed">{m.what}</p>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="space">
        <h2 id="space" className="text-xl font-semibold">On a mission</h2>
        <p className="text-lg leading-relaxed">{m.space}</p>
      </section>

      {recent.length > 0 && (
        <details className="border-y border-rule py-3">
          <summary className="min-h-11 cursor-pointer text-lg font-semibold">Last {recent.length} days as a list</summary>
          <table className="mt-2 w-full text-left font-mono tabular-nums">
            <thead>
              <tr className="text-sm text-dim">
                <th scope="col" className="py-1 font-normal">Date</th>
                <th scope="col" className="py-1 text-right font-normal">{m.t}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {recent.map((d) => (
                <tr key={d.d}>
                  <th scope="row" className="py-2 font-normal text-dim">{d.d}</th>
                  <td className="py-2 text-right text-chalk">{m.fmt(d[m.k] as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </>
  );
}
