/* LEO Toolkit service worker: lets the app open and work offline.
 *
 * - /_next/static/* (hashed build files): cache-first, they never change
 * - pages: network-first, falling back to the last cached copy when offline
 * - /servers/<id>/laws.json and icons: stale-while-revalidate (instant, refreshed in background)
 *
 * Bump VERSION to drop old caches after a breaking change.
 */
const VERSION = 'v1'
const STATIC_CACHE = `leo-static-${VERSION}`
const PAGE_CACHE = `leo-pages-${VERSION}`
const DATA_CACHE = `leo-data-${VERSION}`
const PRECACHE_PAGES = ['/', '/bodycam-commands', '/patrolman-guide', '/reports', '/profile']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => Promise.all(PRECACHE_PAGES.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, PAGE_CACHE, DATA_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('leo-') && !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const res = await fetch(request)
  if (res.ok) (await caches.open(STATIC_CACHE)).put(request, res.clone())
  return res
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/'))
    if (cached) return cached
    return new Response('<h1>Offline</h1><p>Open the app once while online so it can be used offline.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone())
      return res
    })
    .catch(() => cached)
  return cached || refresh
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
  } else if (url.pathname.startsWith('/servers/') || url.pathname === '/icon.svg') {
    event.respondWith(staleWhileRevalidate(request))
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  }
})
