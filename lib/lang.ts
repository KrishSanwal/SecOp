import RU from "./ru.json";

export type Lang = "en" | "ru";
const KEY = "secop-lang";

export function getLang(): Lang {
  try {
    return localStorage.getItem(KEY) === "ru" ? "ru" : "en";
  } catch {
    return "en";
  }
}

export function setLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
}

const exact = new Map<string, string>();
const pats: { re: RegExp; to: string; lit: number }[] = [];
for (const [k, v] of Object.entries(RU as Record<string, string>)) {
  if (/\{\d+\}/.test(k)) {
    const src = k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\d+)\}/g, (_, i) => `(?<p${i}>.+?)`);
    pats.push({ re: new RegExp(`^${src}$`), to: v, lit: k.replace(/\{\d+\}/g, "").length });
  } else exact.set(k, v);
}
pats.sort((a, b) => b.lit - a.lit);

const latin = (s: string) => s.match(/[A-Za-z]/g)?.length ?? 0;

// several patterns can fit one sentence; keep the one that leaves the least English
function core(t: string, d: number): string | null {
  const e = exact.get(t);
  if (e !== undefined) return e;
  if (d > 2) return null;
  let best: string | null = null;
  let left = Infinity;
  for (const p of pats) {
    const m = p.re.exec(t);
    if (!m) continue;
    const out = p.to.replace(/\{(\d+)\}/g, (_, i) => {
      const g = m.groups?.[`p${i}`] ?? "";
      const gt = g.trim();
      return /[A-Za-z]/.test(gt) ? (core(gt, d + 1) ?? g) : g;
    });
    const l = latin(out);
    if (l < left) {
      best = out;
      left = l;
      if (l === 0) break;
    }
  }
  return best;
}

const CYR = /[Ѐ-ӿ]/;
const memo = new Map<string, string | null>();

export function tr(s: string): string | null {
  const t = s.replace(/\s+/g, " ").trim();
  if (!t || !/[A-Za-z]/.test(t) || CYR.test(t)) return null;
  let out = memo.get(t);
  if (out === undefined) {
    out = core(t, 0);
    if (memo.size > 5000) memo.clear();
    memo.set(t, out);
  }
  if (out === null) return null;
  return (/^\s/.test(s) ? " " : "") + out + (/\s$/.test(s) ? " " : "");
}
