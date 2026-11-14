"use client";

import { ArrowsDownUp, Check, Plus } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { listCrew, putCrew, uid } from "@/lib/db";
import type { Crew } from "@/lib/types";
import { Bottom, btn, ghost, primary, tile } from "./ui";

type Slot = "subj" | "exr";

const byName = (xs: Crew[]) => [...xs].sort((a, b) => a.name.localeCompare(b.name));
const why = (e: unknown, fb: string) => (e instanceof Error ? e.message : fb);

export default function CrewPick() {
  const [crew, setCrew] = useState<Crew[] | null>(null);
  const [subj, setSubj] = useState("");
  const [exr, setExr] = useState("");
  const [err, setErr] = useState("");
  const [flip, setFlip] = useState(0);

  useEffect(() => {
    listCrew()
      .then((xs) => {
        const s = byName(xs);
        setCrew(s);
        setSubj(s[0]?.id ?? "");
        setExr(s[1]?.id ?? "");
      })
      .catch((e) => setErr(why(e, "Could not open crew records.")));
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
    setFlip((n) => n + 1);
  }

  async function add(name: string, role: string) {
    const c: Crew = { id: uid(), name, ...(role ? { role } : {}) };
    try {
      await putCrew(c);
    } catch (e) {
      return why(e, "Could not save. Try again.");
    }
    setCrew((xs) => byName([...(xs ?? []), c]));
    if (!subj) setSubj(c.id);
    else if (!exr) setExr(c.id);
    return null;
  }

  if (err) {
    return (
      <p role="alert" className="border-l-4 border-alert bg-panel p-4 text-alert">
        {err} Reload the page. If it keeps failing, this browser may be blocking storage.
      </p>
    );
  }
  if (!crew) return <p className="min-h-40 font-mono text-dim">Loading crew…</p>;

  const s = crew.find((c) => c.id === subj);
  const x = crew.find((c) => c.id === exr);
  const ready = s && x && s.id !== x.id;
  const few = crew.length < 2;

  return (
    <>
      <section className="flex flex-col items-start gap-4">
        {ready ? (
          <h1 key={flip} className="text-[2.75rem] leading-[1.15] font-bold text-balance motion-safe:animate-swap">
            <Blank>{x.name}</Blank> <span className="font-medium text-dim">examines</span> <Blank>{s.name}</Blank>
          </h1>
        ) : (
          <h1 className="text-[2.75rem] leading-[1.05] font-bold">Set up the exam</h1>
        )}
        <p className="max-w-[36ch] text-lg leading-relaxed text-dim">
          {ready
            ? "The examiner runs five stations and enters the results. Then switch roles."
            : few
              ? "Add two crew members. One is examined, the other runs the exam."
              : "Pick who is examined and who runs the exam."}
        </p>
        {ready && (
          <button type="button" onClick={swap} className={ghost}>
            <ArrowsDownUp size={20} weight="bold" aria-hidden />
            Swap roles
          </button>
        )}
      </section>

      {!few && (
        <>
          <Group n={1} slot="subj" legend="Who is being examined?" tag="Examining" crew={crew} sel={subj} other={exr} onPick={pick} />
          <Group n={2} slot="exr" legend="Who runs the exam?" tag="Being examined" crew={crew} sel={exr} other={subj} onPick={pick} />
        </>
      )}

      <AddCrew crew={crew} onAdd={add} />

      <Bottom>
        {ready ? (
          <Link href={{ pathname: "/exam", query: { subj: s.id, exr: x.id } }} className={primary}>
            Start the exam
          </Link>
        ) : (
          <button type="button" disabled className={primary}>
            Start the exam
          </button>
        )}
      </Bottom>
    </>
  );
}

function Blank({ children }: { children: ReactNode }) {
  return <span className="border-b-4 border-accent pb-0.5 text-chalk [box-decoration-break:clone]">{children}</span>;
}

function Group(p: { n: number; slot: Slot; legend: string; tag: string; crew: Crew[]; sel: string; other: string; onPick: (s: Slot, id: string) => void }) {
  return (
    <fieldset>
      <legend className="flex items-baseline gap-3 font-display text-xl font-semibold text-chalk">
        <span className="font-mono text-sm text-accent" aria-hidden>
          0{p.n}
        </span>
        {p.legend}
      </legend>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {p.crew.map((c) => {
          const on = c.id === p.sel;
          const note = c.id === p.other ? p.tag : c.role;
          return (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name={p.slot} checked={on} onChange={() => p.onPick(p.slot, c.id)} className="peer sr-only" />
              <span className={`flex min-h-18 items-start justify-between gap-2 px-4 py-3 ${tile}`}>
                <span className="flex min-w-0 flex-col">
                  <span className="leading-snug font-semibold break-words">{c.name}</span>
                  {note && <span className="text-sm text-dim">{note}</span>}
                </span>
                {on && <Check size={20} weight="bold" className="mt-0.5 shrink-0" aria-hidden />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function AddCrew({ crew, onAdd }: { crew: Crew[]; onAdd: (name: string, role: string) => Promise<string | null> }) {
  const few = crew.length < 2;
  const [open, setOpen] = useState(few);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [bad, setBad] = useState("");
  const [done, setDone] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 40);
    if (!n) return setBad("Enter a name.");
    if (crew.some((c) => c.name.toLowerCase() === n.toLowerCase())) return setBad(`${n} is already on the crew.`);
    const fail = await onAdd(n, role.trim().slice(0, 40));
    if (fail) return setBad(fail);
    setName("");
    setRole("");
    setBad("");
    setDone(`Added ${n}.`);
    ref.current?.focus();
  }

  function close() {
    setOpen(false);
    setBad("");
    setDone("");
  }

  if (!open && !few) {
    return (
      <div className="flex items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="font-mono text-sm text-dim">{crew.length} on the crew</p>
        <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className={ghost}>
          <Plus size={20} weight="bold" aria-hidden />
          Add crew member
        </button>
      </div>
    );
  }

  const field =
    "mt-2 min-h-12 w-full rounded-[3px] border border-edge bg-panel px-4 text-lg text-chalk placeholder:text-dim/70 focus:border-accent focus:outline-none aria-[invalid=true]:border-alert";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 border-t border-rule pt-6">
      <h2 className="text-xl font-semibold">Add crew member</h2>
      <div>
        <label htmlFor={`${id}-n`} className="font-semibold text-chalk">
          Name
        </label>
        <input
          id={`${id}-n`}
          ref={ref}
          autoFocus={!few}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setBad("");
          }}
          maxLength={40}
          autoComplete="off"
          aria-invalid={!!bad}
          aria-describedby={bad ? `${id}-e` : undefined}
          className={field}
        />
        {bad && (
          <p id={`${id}-e`} className="mt-2 text-alert">
            {bad}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-r`} className="font-semibold text-chalk">
          Role <span className="font-normal text-dim">(optional)</span>
        </label>
        <input
          id={`${id}-r`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder="Commander, flight engineer"
          className={field}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className={`${btn} flex-1 border border-accent text-accent hover:bg-accent/10 active:bg-rule`}>
          Add to crew
        </button>
        {!few && (
          <button type="button" onClick={close} className={ghost}>
            Done
          </button>
        )}
      </div>
      <p aria-live="polite" className="-mt-2 min-h-6 text-dim">
        {done}
      </p>
    </form>
  );
}
