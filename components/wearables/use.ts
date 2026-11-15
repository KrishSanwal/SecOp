"use client";

import { useCallback, useEffect, useState } from "react";
import { getCrew } from "@/lib/db";
import { demo } from "@/lib/health/demo";
import { dropPull, getPull, savePull } from "@/lib/health/store";
import type { Pull, Src } from "@/lib/health/types";
import type { Crew } from "@/lib/types";

export interface Wear {
  crew?: Crew;
  pull: Pull | null;
  src: Src;
  busy: boolean;
  err: string;
  sync: () => Promise<void>;
  drop: () => Promise<void>;
}

const demoPull = (c: Crew): Pull => ({ days: demo(c.id, c.name === "Asha"), missing: [], at: Date.now() });

export function useWear(id: string | null, autoSync = false): Wear {
  const [crew, setCrew] = useState<Crew>();
  const [pull, setPull] = useState<Pull | null>(null);
  const [src, setSrc] = useState<Src>("demo");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const sync = useCallback(async () => {
    if (!id) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/health/data?crew=${encodeURIComponent(id)}`).catch(() => null);
      if (!res) throw new Error("No connection. Showing the last saved readings.");
      const j = await res.json().catch(() => null);
      if (res.status === 401) throw new Error("Wearable not connected yet. Connect it to see real readings.");
      if (!res.ok || !j || !Array.isArray(j.days)) throw new Error(j?.error ?? `Sync failed (${res.status}).`);
      const p: Pull = { days: j.days, missing: Array.isArray(j.missing) ? j.missing : [], at: typeof j.at === "number" ? j.at : Date.now() };
      await savePull({ ...p, crew: id, src: "live" });
      setPull(p);
      setSrc("live");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let off = false;
    (async () => {
      try {
        const c = await getCrew(id);
        if (off) return;
        setCrew(c);
        const s = await getPull(id);
        if (off) return;
        if (s) {
          setPull(s);
          setSrc(s.src);
        } else if (c) {
          setPull(demoPull(c));
          setSrc("demo");
        }
        if (autoSync) void sync();
      } catch {
        if (!off) setErr("Could not open records.");
      }
    })();
    return () => {
      off = true;
    };
  }, [id, autoSync, sync]);

  const drop = useCallback(async () => {
    if (!id) return;
    setErr("");
    try {
      await fetch(`/api/health/data?crew=${encodeURIComponent(id)}`, { method: "DELETE" });
      await dropPull(id);
      if (crew) setPull(demoPull(crew));
      setSrc("demo");
    } catch {
      setErr("Could not disconnect. Try again.");
    }
  }, [id, crew]);

  return { crew, pull, src, busy, err, sync, drop };
}
