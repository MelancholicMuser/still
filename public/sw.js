/* Still – service worker
 *
 * Strategy
 *  - App shell ("/"): network-first (so deploys show up immediately), falling back to the
 *    cached copy when offline or when the network is slow.
 *  - /_next/static/*: cache-first. These files are content-hashed, so a cached copy is never stale.
 *  - Icons / manifest: stale-while-revalidate.
 *  - Everything else (cross-origin, analytics, non-GET): untouched.
 *
 * Bump VERSION if you ever change the strategy above; old caches are deleted on activate.
 */
const VERSION = "v1";
const CACHE = `still-${VERSION}`;
const SHELL = "/";
const PRECACHE = [
  SHELL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-icon.png",
];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // 1. Core shell + icons. A single failure must not abort the install.
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );

      // 2. The hashed JS/CSS the shell points at. Without this, the very first visit
      //    (when this worker is not yet controlling the page) would never get its assets
      //    cached and the app would not open offline until a second online visit.
      try {
        const shell = await cache.match(SHELL);
        if (shell) {
          const html = await shell.text();
          const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []);
          await Promise.all([...assets].map((url) => cache.add(url).catch(() => {})));
        }
      } catch (_) {
        /* best effort */
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("still-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_vercel/") || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(navigate(req, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

async function navigate(req, url) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), NAV_TIMEOUT_MS)),
    ]);
    // Only the app shell is cached; other URLs (404s etc.) pass through untouched.
    if (res.ok && url.pathname === SHELL) cache.put(SHELL, res.clone());
    return res;
  } catch (_) {
    const cached = await cache.match(SHELL);
    return (
      cached ||
      new Response("You're offline and Still hasn't been cached yet. Open it once while online.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}
