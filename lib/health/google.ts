import { beatsOf, fold, type Pts } from "./map";
import type { Pull } from "./types";

const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const API = "https://health.googleapis.com/v4/users/me/dataTypes";
const SC = "https://www.googleapis.com/auth/googlehealth.";

export class HError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

export const okCrew = (s: string | null): s is string => !!s && /^[\w-]{1,64}$/.test(s);

export function cfg() {
  const id = process.env.GOOGLE_HEALTH_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_HEALTH_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new HError(500, "Google Health is not set up. Add GOOGLE_HEALTH_CLIENT_ID and GOOGLE_HEALTH_CLIENT_SECRET to .env.local.");
  return { id, secret, redirect: process.env.GOOGLE_HEALTH_REDIRECT?.trim() };
}

export function scopes() {
  const s = ["activity_and_fitness", "health_metrics_and_measurements", "sleep"].map((x) => `${SC}${x}.readonly`);
  if (process.env.GOOGLE_HEALTH_IRN === "1") s.push(`${SC}irn.readonly`);
  return s;
}

export function consent(redirect: string, state: string) {
  const q = new URLSearchParams({
    client_id: cfg().id,
    redirect_uri: redirect,
    response_type: "code",
    scope: scopes().join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${AUTH}?${q}`;
}

async function tok(body: Record<string, string>) {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg().id, client_secret: cfg().secret, ...body }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) {
    const bad = j?.error === "invalid_grant";
    throw new HError(bad ? 401 : 502, bad ? "Google access expired. Connect the monitor again." : `Google token ${res.status}: ${String(j?.error_description ?? j?.error ?? "no body").slice(0, 160)}`);
  }
  return j as { access_token?: string; refresh_token?: string };
}

export async function exchange(code: string, redirect: string) {
  const j = await tok({ grant_type: "authorization_code", code, redirect_uri: redirect });
  if (!j.access_token || !j.refresh_token) throw new HError(502, "Google gave no refresh token. Remove the app from your Google account permissions and connect again.");
  return { access: j.access_token, refresh: j.refresh_token };
}

export async function refresh(rt: string) {
  const j = await tok({ grant_type: "refresh_token", refresh_token: rt });
  if (!j.access_token) throw new HError(502, "Google gave no access token.");
  return j.access_token;
}

const snake = (t: string) => t.replaceAll("-", "_");
const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

type Kind = "date" | "start" | "end" | "sample";
const SPEC: [string, Kind, number][] = [
  ["daily-resting-heart-rate", "date", 1],
  ["daily-heart-rate-variability", "date", 1],
  ["daily-oxygen-saturation", "date", 1],
  ["daily-respiratory-rate", "date", 1],
  ["daily-sleep-temperature-derivations", "date", 1],
  ["daily-vo2-max", "date", 1],
  ["sleep", "end", 3],
  ["steps", "start", 6],
  ["active-minutes", "start", 4],
  ["sedentary-period", "start", 4],
  ["irregular-rhythm-notification", "start", 1],
];

async function list(access: string, type: string, kind: Kind, pages: number, from: number, to?: number): Promise<Pts> {
  const s = snake(type);
  const at = kind === "end" ? `${s}.interval.end_time` : kind === "start" ? `${s}.interval.start_time` : `${s}.sample_time.physical_time`;
  let filter = kind === "date" ? `${s}.date >= "${ymd(from)}"` : `${at} >= "${new Date(from).toISOString()}"`;
  if (to !== undefined && kind !== "date") filter += ` AND ${at} < "${new Date(to).toISOString()}"`;
  const out: Pts = [];
  let next = "";
  for (let i = 0; i < pages; i++) {
    const q = new URLSearchParams({ filter, pageSize: type === "sleep" ? "25" : "10000" });
    if (next) q.set("pageToken", next);
    const res = await fetch(`${API}/${type}/dataPoints?${q}`, { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) {
      const b = await res.text().catch(() => "");
      throw new HError(res.status === 429 ? 429 : res.status === 401 || res.status === 403 ? res.status : 502, `${type} ${res.status}: ${b.slice(0, 160)}`);
    }
    const j = await res.json().catch(() => null);
    if (!j) throw new HError(502, `${type}: bad JSON`);
    if (Array.isArray(j.dataPoints)) out.push(...j.dataPoints);
    next = typeof j.nextPageToken === "string" ? j.nextPageToken : "";
    if (!next) break;
  }
  return out;
}

export async function pull(access: string, days = 30, now = Date.now()): Promise<Pull> {
  const from = now - days * 86_400_000;
  const rs = await Promise.allSettled(SPEC.map(([t, k, p]) => list(access, t, k, p, from)));
  const by: Record<string, Pts> = {};
  const missing: string[] = [];
  const gone = rs.find((r) => r.status === "rejected" && r.reason instanceof HError && r.reason.status === 401);
  if (gone) throw (gone as PromiseRejectedResult).reason;
  rs.forEach((r, i) => {
    if (r.status === "fulfilled") by[SPEC[i][0]] = r.value;
    else missing.push(SPEC[i][0]);
  });
  if (missing.length === SPEC.length) throw new HError(502, `Google Health returned nothing. ${String((rs[0] as PromiseRejectedResult).reason?.message ?? "").slice(0, 200)}`);
  return { days: fold(by), missing, at: now };
}

export async function beats(access: string, from: number, to: number) {
  return beatsOf(await list(access, "heart-rate", "sample", 2, from, to));
}

export function hfail(e: unknown) {
  const status = e instanceof HError ? e.status : 500;
  return Response.json({ error: e instanceof Error ? e.message : "unknown error" }, { status });
}
