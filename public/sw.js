/**
 * Rigel service worker.
 *
 * Two caches, because the two kinds of thing in them have different lifetimes.
 *
 * The shell is `/`, `/index.html` and the manifest: a handful of entries that
 * are overwritten in place, never accumulated, and that exist so the installed
 * app boots with no connection.
 *
 * Runtime holds the hashed assets Vite emits. Those filenames change on every
 * build, so nothing stale is ever served from here, but nothing was ever
 * removed either: each deploy added a fresh set of files to a cache that was
 * only cleared when its name changed, which it never did. Two things fix that
 * now. VERSION is in the cache names and is raised whenever the shell contract
 * changes, so activate can drop every cache that is not the current pair. And
 * the runtime cache is bounded: the Cache API returns keys in insertion order,
 * so trimming from the front evicts the least recently added entry, which for
 * a build's worth of hashed files is the oldest build's.
 */

const VERSION = "v2";
const SHELL_CACHE = `rgl-shell-${VERSION}`;
const RUNTIME_CACHE = `rgl-runtime-${VERSION}`;
const CURRENT = [SHELL_CACHE, RUNTIME_CACHE];

const SHELL = ["/", "/index.html", "/manifest.webmanifest"];

/**
 * Entries kept in the runtime cache. A build is roughly thirty hashed chunks
 * plus fonts and icons, so this holds the current build and the one before it
 * and evicts anything older.
 */
const RUNTIME_LIMIT = 80;

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Insertion order, so the front of the list is the oldest thing put here.
  for (let i = 0; i < keys.length - limit; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => trim(RUNTIME_CACHE, RUNTIME_LIMIT))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // App navigations: network first, fall back to the cached shell so the
  // installed app still boots with no connection.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() =>
          caches
            .open(SHELL_CACHE)
            .then((c) => c.match("/index.html").then((hit) => hit || c.match("/"))),
        ),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((hit) => {
      const fetcher = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((c) => c.put(req, copy))
              .then(() => trim(RUNTIME_CACHE, RUNTIME_LIMIT));
          }
          return res;
        })
        .catch(() => hit);
      return hit || fetcher;
    }),
  );
});
