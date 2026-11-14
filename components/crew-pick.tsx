"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { listCrew, putCrew, uid } from "@/lib/db";
import type { Crew } from "@/lib/types";

type Slot = "subj" | "exr";

const byName = (xs: Crew[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name));

export default function CrewPick() {
  const [crew, setCrew] = useState<Crew[] | null>(null);
  const [subj, setSubj] = useState("");
  const [exr, setExr] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    listCrew()
      .then((xs) => {
        const s = byName(xs);
        setCrew(s);
        setSubj(s[0]?.id ?? "");
        setExr(s[1]?.id ?? "");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not open crew records."));
  }, []);

  function pick(slot: Slot, id: string) {
    const [mine, other, setMine, setOther] =
      slot === "subj" ? [subj, exr, setSubj, setExr] : [exr, subj, setExr, setSubj];
    if (id === other) setOther(mine);
    setMine(id);
  }

  function swap() {
    setSubj(exr);
    setExr(subj);
  }

  async function add(name: string, role: string) {
    const c: Crew = { id: uid(), name, ...(role ? { role } : {}) };
    try {
      await putCrew(c);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save crew member.");
      return;
    }
    setCrew((xs) => byName([...(xs ?? []), c]));
    if (!subj) setSubj(c.id);
    else if (!exr) setExr(c.id);
  }

  if (err) return <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{err}</p>;
  if (!crew) return <p className="text-zinc-500">Loading crew…</p>;

  const who = (id: string) => crew.find((c) => c.id === id);
  const s = who(subj);
  const x = who(exr);
  const ready = s && x && s.id !== x.id;

  return (
    <div className="flex flex-col gap-8">
      {crew.length < 2 ? (
        <p className="rounded-xl border border-white/10 p-4 text-zinc-400">
          {crew.length ? "Add one more crew member to start." : "Add your crew to start. You need two people."}
        </p>
      ) : (
        <>
          <div className="flex flex-col items-stretch">
            <Card slot="subj" crew={crew} sel={subj} onPick={pick} />
            <button
              type="button"
              onClick={swap}
              aria-label="Swap subject and examiner"
              className="z-10 -my-3 flex size-12 self-center items-center justify-center rounded-full border border-white/15 bg-background text-accent transition hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4" />
              </svg>
            </button>
            <Card slot="exr" crew={crew} sel={exr} onPick={pick} />
          </div>

          {ready ? (
            <Link
              href={{ pathname: "/exam", query: { subj: s.id, exr: x.id } }}
              className="flex min-h-14 items-center justify-center rounded-xl bg-accent px-5 text-center text-lg font-semibold text-background transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Start exam: {x.name} examines {s.name}
            </Link>
          ) : (
            <p className="flex min-h-14 items-center justify-center rounded-xl border border-white/10 text-zinc-500">
              Pick two different people
            </p>
          )}
        </>
      )}

      <AddCrew onAdd={add} />
    </div>
  );
}

const LABEL: Record<Slot, [string, string]> = {
  subj: ["Subject", "being examined"],
  exr: ["Examiner", "runs the exam, holds the device"],
};

function Card({ slot, crew, sel, onPick }: { slot: Slot; crew: Crew[]; sel: string; onPick: (s: Slot, id: string) => void }) {
  const [title, hint] = LABEL[slot];
  const c = crew.find((x) => x.id === sel);
  return (
    <section aria-label={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-zinc-400">
        <span className="font-semibold uppercase tracking-wider text-foreground">{title}</span> · {hint}
      </p>
      <p className="mt-2 text-2xl font-semibold">{c?.name ?? "Nobody yet"}</p>
      {c?.role && <p className="text-sm text-zinc-400">{c.role}</p>}
      <div role="group" aria-label={`Choose ${title.toLowerCase()}`} className="mt-4 flex flex-wrap gap-2">
        {crew.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-pressed={x.id === sel}
            onClick={() => onPick(slot, x.id)}
            className="min-h-11 rounded-full border border-white/15 px-4 text-sm transition hover:border-white/40 focus-visible:outline-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-accent/15 aria-pressed:text-accent"
          >
            {x.name}
          </button>
        ))}
      </div>
    </section>
  );
}

function AddCrew({ onAdd }: { onAdd: (name: string, role: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    await onAdd(n.slice(0, 40), role.trim().slice(0, 40));
    setName("");
    setRole("");
  }

  const input =
    "min-h-12 w-full rounded-xl border border-white/15 bg-transparent px-4 placeholder:text-zinc-600 focus:border-accent focus:outline-none";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t border-white/10 pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Add crew member</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={40} required className={input} />
        </label>
        <label className="flex-1">
          <span className="sr-only">Role (optional)</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (optional)" maxLength={40} className={input} />
        </label>
      </div>
      <button
        type="submit"
        disabled={!name.trim()}
        className="min-h-12 rounded-xl border border-accent/50 font-semibold text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-600 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Add
      </button>
    </form>
  );
}
