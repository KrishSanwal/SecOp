import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Crew, Exam } from "./types";

interface Schema extends DBSchema {
  crew: { key: string; value: Crew };
  exams: { key: string; value: Exam; indexes: { subj: string } };
}

let conn: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB only works in the browser");
  conn ??= openDB<Schema>("second-opinion", 1, {
    upgrade(d) {
      d.createObjectStore("crew", { keyPath: "id" });
      d.createObjectStore("exams", { keyPath: "id" }).createIndex("subj", "subj");
    },
  });
  return conn;
}

// randomUUID only exists on https or localhost; a phone on http://<pc-ip> needs the fallback
export function uid() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function putCrew(c: Crew) {
  await (await db()).put("crew", c);
}

export async function listCrew() {
  return (await db()).getAll("crew");
}

export async function getCrew(id: string) {
  return (await db()).get("crew", id);
}

export async function putExam(e: Exam) {
  await (await db()).put("exams", e);
}

export async function getExam(id: string) {
  return (await db()).get("exams", id);
}

export async function examsOf(subj: string) {
  const xs = await (await db()).getAllFromIndex("exams", "subj", subj);
  return xs.sort((a, b) => a.at - b.at);
}

export async function dump() {
  const d = await db();
  return { crew: await d.getAll("crew"), exams: await d.getAll("exams"), at: Date.now() };
}

export async function wipe() {
  const d = await db();
  await Promise.all([d.clear("crew"), d.clear("exams")]);
}

export async function exportJson() {
  const blob = new Blob([JSON.stringify(await dump(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `secop-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
