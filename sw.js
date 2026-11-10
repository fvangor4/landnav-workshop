// Service worker: makes the site work with no signal after the first visit.
//
// Every page and asset is cached on install. Requests are answered from the
// cache straight away and refreshed from the network in the background, so an
// update shows up on the visit after it is published.
//
// When you add a page, script, or stylesheet, add it to ASSETS. The test in
// tests/offline.test.js fails if one is missing.

const CACHE = 'landnav-v1';

const ASSETS = [
  './',
  'index.html',
  'tools.html',
  'drill.html',
  'instructor.html',
  'worksheet.html',
  'css/styles.css',
  'js/site.js',
  'js/config.js',
  'js/azimuth.js',
  'js/pace.js',
  'js/grid.js',
  'js/grid-svg.js',
  'js/problems.js',
  'js/tools-ui.js',
  'js/drill-ui.js',
  'js/worksheet-ui.js',
  'manifest.webmanifest',
  'icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ignoreSearch: worksheet.html?n=1234 is the same file as worksheet.html.
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(new URL(request.url).pathname, response.clone());
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(refresh);
        return cached;
      }
      return (await refresh) || Response.error();
    }),
  );
});
