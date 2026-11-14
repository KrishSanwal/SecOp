const V = "so-v3";
const PAGES = ["/", "/exam", "/result"];

const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]);

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    (async () => {
      const c = await caches.open(V);
      const ids = await within(fetch("/audio/index.json").then((r) => r.json()), 5000).catch(() => null);
      const urls = [...PAGES, "/manifest.webmanifest", "/audio/index.json", ...(ids || []).map((id) => `/audio/${id}.mp3`)];
      await within(Promise.all(urls.map((u) => c.add(u).catch(() => {}))), 15000); // never block install on one file
    })(),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  const immutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/audio/");
  e.respondWith(immutable ? cacheFirst(req) : netFirst(req));
});

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(V)).put(req, res.clone());
  return res;
}

async function netFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) (await caches.open(V)).put(req, res.clone());
    return res;
  } catch {
    const url = new URL(req.url);
    return (
      (await caches.match(req)) ||
      (await caches.match(url.pathname)) ||
      (req.mode === "navigate" && (await caches.match("/"))) ||
      new Response("Offline", { status: 503 })
    );
  }
}
