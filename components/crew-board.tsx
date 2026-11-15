"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dump } from "@/lib/db";
import { crewInsight } from "@/lib/insights";
import { report } from "@/lib/scoring";
import type { Crew, Exam } from "@/lib/types";

/** Whole-crew view: who was last examined when, how many flags, and whether the crew is drifting together. */
export default function CrewBoard() {
  const [d, setD] = useState<{ crew: Crew[]; exams: Exam[]; now: number } | null>(null);
  useEffect(() => {
    dump().then((x) => setD({ ...x, now: Date.now() })).catch(() => setD({ crew: [], exams: [], now: 0 }));
  }, []);
  if (!d || d.exams.length === 0) return null;

  const rows = d.crew.map((c) => {
    const hist = d.exams.filter((e) => e.subj === c.id).sort((a, b) => a.at - b.at);
    const last = hist.at(-1);
    return { c, hist, last, flags: last ? report(last, hist).flags.length : 0 };
  });
  const tips = crewInsight(rows.map((r) => ({ name: r.c.name, hist: r.hist })));
  const days = (at: number) => Math.round((d.now - at) / 864e5);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="board">
      <h2 id="board" className="text-xl font-semibold">
        Crew
      </h2>
      {tips.map((t) => (
        <p key={t} className="rounded-lg border border-alert/60 bg-panel p-3">
          {t}
        </p>
      ))}
      <ul className="flex flex-col divide-y divide-rule border-y border-rule">
        {rows.map(({ c, hist, last, flags }) => (
          <li key={c.id}>
            <Link href={{ pathname: "/trend", query: { crew: c.id } }} className="flex min-h-14 items-center justify-between gap-3 py-2">
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-sm text-dim">
                  {last ? `${hist.length} exams, last ${days(last.at) === 0 ? "today" : `${days(last.at)} d ago`}` : "No exams yet"}
                </span>
              </span>
              <span className={`text-sm ${flags ? "text-alert" : "text-dim"}`}>{last ? (flags ? `${flags} flag${flags > 1 ? "s" : ""}` : "clear") : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/sync" className="w-fit text-dim hover:text-foreground">
        Share or receive records with another phone, no network
      </Link>
    </section>
  );
}
