/* ═══════════════════════════════════════════════════════════
   MCM 2026 — Service Worker
   Strategy: Cache-first for static assets, network-first for HTML
══════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'mcm-2026-v1';
const STATIC_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:ital,wght@0,700;0,800;0,900;1,800&display=swap'
];

/* ── Install: pre-cache static assets ─────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: delete old caches ──────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (except Google Fonts)
  if (request.method !== 'GET') return;

  const isFont = url.hostname.includes('googleapis.com') ||
                 url.hostname.includes('gstatic.com');

  if (!url.origin.includes(self.location.origin) && !isFont) return;

  // HTML: network-first (always fresh content)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    );
    return;
  }

  // Static assets & fonts: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (!res || res.status !== 200) return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, clone));
        return res;
      });
    })
  );
});
