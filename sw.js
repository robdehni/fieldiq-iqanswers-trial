const CACHE_NAME = 'fieldiq-shell-v6-pearl';
const APP_SHELL = [
  '/',
  '/index.html',
  '/fieldiq-theme.css',
  '/fieldiq-theme.css?v=pearl1',
  '/iq-mascot.svg',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
];
// Closed allowlist of the static files deployed for FieldIQ. Only these
// same-origin paths may be written to or served from Cache Storage. Every
// other same-origin request - including all FieldIQ API paths once they
// move to this origin - is network-only and is never cached. The list is
// explicit rather than a pattern so that an unlisted path fails closed:
// it is served from the network, never from a stale cache entry.
const STATIC_ALLOWLIST = new Set([
  '/',
  '/index.html',
  '/dashboard.html',
  '/fieldiq.html',
  '/fieldiq-accounts.html',
  '/fieldiq-actions.html',
  '/fieldiq-activity-overview.html',
  '/fieldiq-broadcast.html',
  '/fieldiq-calendar.html',
  '/fieldiq-guide.html',
  '/fieldiq-insights.html',
  '/fieldiq-log-visit.html',
  '/fieldiq-manager-calendar.html',
  '/fieldiq-open-actions.html',
  '/fieldiq-operations.html',
  '/fieldiq-report.html',
  '/fieldiq-team-requests.html',
  '/fieldiq-visit-history.html',
  '/fieldiq-visits-map.html',
  '/fieldiq-theme.css',
  '/iq-mascot.svg',
  '/fieldiq-manager-guide.html',
  '/brand-config.js',
  '/fiq-tz.js',
  '/manifest.json',
  '/icon-180.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-512-maskable.png'
]);
// Every network attempt inside this file is bounded — if a request stalls
// (opens but never completes or errors, a real and common mobile-network
// failure mode), it is aborted after 8 seconds and treated as a network
// failure, falling through to the cache. Without this, a stalled fetch()
// inside respondWith() would leave the page's own resource request
// hanging indefinitely — this is what produced pages that "kept loading
// indefinitely" in the earlier service worker.
function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 8000);
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer));
}
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => {
        // A missing or failing app-shell file (e.g. one icon returning a
        // non-200) previously caused addAll() to reject with no handler,
        // which fails the entire install silently — the update would
        // never activate and no one would know why. Logged, not
        // swallowed, and does not throw further: skipWaiting() below
        // still runs so a partial-shell install doesn't block activation
        // of an otherwise-working update.
        console.error('[sw] app shell caching failed:', err);
      })
  );
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          // Only FieldIQ's own older app-shell caches are removed.
          .filter(key => key.indexOf('fieldiq-') === 0 && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Cross-origin requests (CDN assets, and the Worker API while it remains
  // on workers.dev) are left entirely to the network, exactly as before.
  if (url.origin !== self.location.origin) return;
  // Same-origin requests that are not known static files are network-only.
  // This guard sits ahead of both the navigate and same-origin branches, so
  // no API response can be cached by either path.
  if (!STATIC_ALLOWLIST.has(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      fetchWithTimeout(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
