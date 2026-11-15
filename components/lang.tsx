"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getLang, setLang, tr } from "@/lib/lang";

const ATTR = ["aria-label", "placeholder", "title", "alt"];
const SKIP = "script,style,textarea,[data-no-tr]";

function text(n: Node) {
  const p = n.parentElement;
  if (!p || p.closest(SKIP)) return;
  const v = tr(n.nodeValue ?? "");
  if (v !== null && v !== n.nodeValue) n.nodeValue = v;
}

function attrs(el: Element) {
  if (el.closest(SKIP)) return;
  for (const a of ATTR) {
    const v0 = el.getAttribute(a);
    if (!v0) continue;
    const v = tr(v0);
    if (v !== null && v.trim() !== v0) el.setAttribute(a, v.trim());
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return text(root);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  attrs(root as Element);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) text(n);
    else attrs(n as Element);
  }
}

export function Translator() {
  useEffect(() => {
    if (getLang() !== "ru") return;
    const html = document.documentElement;
    html.lang = "ru";
    walk(html);
    const obs = new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") text(m.target);
        else if (m.type === "attributes") attrs(m.target as Element);
        else m.addedNodes.forEach(walk);
      }
    });
    obs.observe(html, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTR });
    return () => obs.disconnect();
  }, []);
  return null;
}

const none = () => () => {};

export function LangSwitch() {
  const l = useSyncExternalStore(none, getLang, () => "en" as const);
  return (
    <button
      type="button"
      data-no-tr
      onClick={() => {
        setLang(l === "ru" ? "en" : "ru");
        location.reload();
      }}
      aria-label={l === "ru" ? "Switch to English" : "Переключить на русский"}
      className="min-h-11 content-center px-1.5 text-sm font-semibold whitespace-nowrap text-dim hover:text-accent"
    >
      {l === "ru" ? "EN" : "RU"}
    </button>
  );
}
