// Service worker for the installed Becca Nena POS app (scope: /admin/).
//
// What it does:
// - Keeps the app shell (offline screen, icons, logo) on the device.
// - Serves Next.js build files (/_next/static, which never change once built)
//   from the device after the first load, so the till opens fast.
// - Pages and sales always go to the network. Pages are never cached because
//   they hold live stock and signed-in data; if the network is down, the
//   offline screen is shown instead of the browser's error page.
// - Never touches POST requests (recording a sale, server actions) or Supabase.
//
// Bump VERSION whenever this file or the offline page changes.
const VERSION = "bn-pos-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/pos-offline.html";

const SHELL_FILES = [
  OFFLINE_URL,
  "/pos.webmanifest",
  "/icons/pos-192.png",
  "/icons/pos-512.png",
  "/images/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("bn-pos-") && !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always fresh from the network; offline screen if that fails.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloaded = await event.preloadResponse;
          if (preloaded) return preloaded;
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return cached ?? Response.error();
        }
      })()
    );
    return;
  }

  // Build files have a content hash in their name, so a cached copy is always right.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // App shell files: from the device, refreshed in the background.
  if (SHELL_FILES.includes(url.pathname)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached ?? network;
      })
    );
  }
});
