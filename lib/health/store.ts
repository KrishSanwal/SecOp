import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Pull, Src } from "./types";

export interface Saved extends Pull {
  crew: string;
  src: Src;
}

interface Schema extends DBSchema {
  pulls: { key: string; value: Saved };
}

let conn: Promise<IDBPDatabase<Schema>> | null = null;

function db() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB only works in the browser");
  conn ??= openDB<Schema>("second-opinion-wearables", 1, {
    upgrade(d) {
      d.createObjectStore("pulls", { keyPath: "crew" });
    },
  });
  return conn;
}

export async function savePull(s: Saved) {
  await (await db()).put("pulls", s);
}

export async function getPull(crew: string) {
  return (await db()).get("pulls", crew);
}

export async function dropPull(crew: string) {
  await (await db()).delete("pulls", crew);
}
