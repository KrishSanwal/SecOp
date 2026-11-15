"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { listCrew } from "@/lib/db";
import { digest, flags, latest, usual, verdict } from "@/lib/health/base";
import { META } from "@/lib/health/meta";
import { getNote, saveNote } from "@/lib/health/store";
import type { Crew } from "@/lib/types";
import { Back, Bottom, ghost, primary } from "../ui";
import { Line } from "./line";
import { useWear } from "./use";

const GROUPS = ["Recovery", "Overnight", "Activity"] as const;
const link = `${primary} flex items-center justify-center`;

export default function Board() {
  const q = useSearchParams();
  const id = q.get("crew");
  if (!id) return <Pick />;
  return <One id={id} linked={q.get("linked") === "1"} gerr={q.get("err") ?? ""} />;
}

function Pick() {
  const [cs, setCs] = useState<Crew[] | null>(null);
  useEffect(() => {
    listCrew().then(setCs).catch(() => setCs([]));
  }, []);
  return (
    <>
      <header className="flex flex-col gap-2">
        <Back href="/" label="Crew" />
        <h1 className="text-[2.5rem] leading-[1.05] font-bold">Wearables</h1>
        <p className="text-dim">Daily readings from each crew member&apos;s Fitbit Air. Pick who to open.</p>
      </header>
      {cs && cs.length === 0 && <p className="text-dim">No crew yet. Add crew on the first screen.</p>}
      {cs && cs.length > 0 && (
        <ul className="flex flex-col divide-y divide-rule border-y border-rule">
          {cs.map((c) => (
            <li key={c.id}>
              <Link href={{ pathname: "/wearables", query: { crew: c.id } }} className="flex min-h-14 items-center justify-between gap-3 py-2">
                <span className="font-semibold">{c.name}</span>
                <span className="text-sm text-dim">{c.role ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function One({ id, linked, gerr }: { id: string; linked: boolean; gerr: string }) {
  const w = useWear(id, linked);
  const [note, setNote] = useState("");
  const [nbusy, setNbusy] = useState(false);
  const [nerr, setNerr] = useState("");
  const days = w.pull?.days;
  const fl = days ? flags(days) : [];
  const key = days?.length ? `${id}:${days.at(-1)!.d}:${w.src}` : "";

  useEffect(() => {
    if (!key) return;
    getNote(key).then((n) => setNote(n?.text ?? "")).catch(() => setNote(""));
  }, [key]);

  async function write() {
    if (!days) return;
    setNbusy(true);
    setNerr("");
    try {
      const res = await fetch("/api/health/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest: digest(days), flags: fl.map((f) => f.msg) }),
      }).catch(() => null);
      if (!res) throw new Error("No connection. Notes need a network.");
      const j = await res.json().catch(() => null);
      if (!res.ok || typeof j?.text !== "string") throw new Error(j?.error ?? `Could not write the note (${res.status}).`);
      setNote(j.text);
      await saveNote(key, j.text);
    } catch (e) {
      setNerr(e instanceof Error ? e.message : "Could not write the note.");
    } finally {
      setNbusy(false);
    }
  }

  if (!w.pull || !days) return w.err ? <p role="alert" className="text-alert">{w.err}</p> : <p className="text-dim">Loading…</p>;

  const v = verdict(days, fl);
  const name = w.crew?.name ?? "Crew member";
  const shown = META.filter((m) => (m.k === "irn" ? !w.pull!.missing.includes("irregular-rhythm-notification") : latest(days, m.k)));
  const at = new Date(w.pull.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <header className="flex flex-col gap-2">
        <Back href="/wearables" label="Wearables" />
        <h1 className="text-[2.5rem] leading-[1.05] font-bold">{name}</h1>
        <p className="text-dim">
          {w.src === "live" ? `Fitbit Air, synced ${at}.` : "Sample readings. Connect a band to see real ones."} The shaded line is {name}&apos;s usual over the last 14 days.
        </p>
      </header>

      {(gerr || w.err) && <p role="alert" className="rounded-lg border border-alert/60 bg-panel p-3 text-alert">{gerr || w.err}</p>}
      {linked && !w.err && !gerr && w.src === "live" && <p role="status" className="text-dim">Band connected.</p>}

      <section className="flex flex-col gap-2" aria-labelledby="today">
        <h2 id="today" className="text-xl font-semibold">Today</h2>
        <p className="font-display text-2xl leading-snug font-semibold text-chalk">{v.t}</p>
        <p className="text-lg">{v.why}</p>
        {fl.length > 0 && (
          <ul className="flex flex-col gap-2">
            {fl.map((f) => (
              <li key={f.id} className="rounded-lg bg-panel px-3 py-2 text-lg">{f.msg}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="note">
        <h2 id="note" className="text-xl font-semibold">Note for today</h2>
        {note ? <p className="text-lg leading-relaxed">{note}</p> : <p className="text-dim">A short plain-language read of these numbers.</p>}
        {nerr && <p role="alert" className="text-alert">{nerr}</p>}
        <button type="button" onClick={write} disabled={nbusy} className={`${ghost} w-fit`}>
          {nbusy ? "Writing…" : note ? "Write it again" : "Write a note"}
        </button>
        {note && <p className="text-sm text-dim">Written by AI from the numbers below. Not medical advice.</p>}
      </section>

      {GROUPS.map((g) => {
        const rows = shown.filter((m) => m.group === g);
        if (!rows.length) return null;
        return (
          <section key={g} className="flex flex-col gap-2" aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="text-xl font-semibold">{g === "Overnight" ? "Overnight vitals" : g}</h2>
            <ul className="flex flex-col divide-y divide-rule border-y border-rule">
              {rows.map((m) => {
                const l = m.k === "irn" ? { v: days.at(-1)?.irn ?? 0, i: days.length - 1 } : latest(days, m.k)!;
                const base = usual(days.slice(0, l.i), m.k);
                const hit = fl.some((f) => f.k === m.k);
                return (
                  <li key={m.k}>
                    <Link href={{ pathname: "/wearables/metric", query: { crew: id, m: m.k } }} className="flex min-h-14 flex-col gap-2 py-4">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-chalk">{m.t}</span>
                        <span className="font-mono text-chalk tabular-nums">{m.fmt(l.v)}</span>
                      </span>
                      <Line days={days} k={m.k} />
                      <span className="flex items-baseline justify-between gap-3 font-mono text-sm text-dim">
                        <span>{m.k === "irn" ? "Today" : base != null ? `Usual ${m.fmt(base)}` : "No usual yet"}</span>
                        {hit && <span className="text-alert">Worth a recheck</span>}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {w.src === "live" && w.pull.missing.length > 0 && (
        <p className="text-dim">{w.pull.missing.length} reading types did not come through from Google. Sync again, or check the band has been worn overnight.</p>
      )}

      <p className="text-sm text-dim">These readings give the crew context. They are not a diagnosis. If something feels wrong, follow the action cards after an exam and call the flight surgeon.</p>

      <Bottom>
        {w.src === "live" ? (
          <>
            <button type="button" onClick={w.sync} disabled={w.busy} className={primary}>{w.busy ? "Syncing…" : "Sync now"}</button>
            <button type="button" onClick={w.drop} className={`${ghost} text-dim`}>Disconnect band</button>
          </>
        ) : (
          <a href={`/api/health/auth?crew=${encodeURIComponent(id)}`} className={link}>Connect Fitbit Air</a>
        )}
      </Bottom>
    </>
  );
}
