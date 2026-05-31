/* =====================================================================
   XEMOZ // MEDIA INJECTION CONSOLE — service worker
   - Pre-caches the app shell for offline / instant loads
   - Stale-while-revalidate for same-origin static assets
   - Cache-first for Google Fonts
   - NEVER caches API / proxy responses (always live)
   ===================================================================== */

const VERSION = "xemoz-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.webmanifest",
  "/assets/icon.svg",
];

// Hosts / paths whose responses must always be live (no cache)
const NEVER_CACHE = [
  "/.netlify/functions/",
  "/api/proxy",
  "api-xemoz-official.my.id",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // add individually so one failure doesn't abort the whole install
      await Promise.all(
        SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // never cache API / proxy — go straight to the network
  if (NEVER_CACHE.some((p) => req.url.includes(p))) {
    return; // default browser fetch
  }

  // navigations: network-first, fall back to cached shell (offline)
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put("/index.html", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (
            (await cache.match(req)) ||
            (await cache.match("/index.html")) ||
            (await cache.match("/")) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Google Fonts: cache-first (rarely changes)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(RUNTIME_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      })()
    );
    return;
  }

  // same-origin static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || (await network) || Response.error();
      })()
    );
  }
});
