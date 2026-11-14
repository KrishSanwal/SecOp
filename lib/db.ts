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

export const uid = () => crypto.randomUUID();

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
  a.download = `second-opinion-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
