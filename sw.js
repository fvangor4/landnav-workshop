// Service worker: makes the site work with no signal after the first visit.
//
// Every page and asset is saved on install. Requests are answered from the
// saved copy. Each time a page is opened, the whole site is fetched again in
// the background and the saved copy is replaced only if every file arrived,
// so a phone never ends up with half of an update. A published change
// therefore shows up on the visit after the one that fetched it.
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
  'js/settings.js',
  'js/tools-ui.js',
  'js/drill-ui.js',
  'js/worksheet-ui.js',
  'manifest.webmanifest',
  'icon.svg',
];

const urlOf = (asset) => new URL(asset, self.location.href).href;

// Set while an update is running, so a page that loads five files does not
// start five updates.
let updating = null;

/** Fetch every asset, then save them all. Nothing is saved if any is missing. */
async function saveAll() {
  const responses = await Promise.all(ASSETS.map((asset) => fetch(urlOf(asset), { cache: 'no-cache' })));
  const missing = ASSETS.filter((asset, i) => !responses[i].ok);
  if (missing.length > 0) throw new Error(`Could not fetch: ${missing.join(', ')}`);
  const cache = await caches.open(CACHE);
  await Promise.all(responses.map((response, i) => cache.put(urlOf(ASSETS[i]), response)));
}

function update() {
  if (!updating) {
    updating = saveAll().finally(() => {
      updating = null;
    });
  }
  return updating;
}

self.addEventListener('install', (event) => {
  event.waitUntil(saveAll().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  // ignoreSearch: worksheet.html?n=1234 is the same file as worksheet.html.
  const saved = await cache.match(request, { ignoreSearch: true });
  return saved || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(respond(request));

  if (request.mode === 'navigate') {
    // No signal, or part of the update missing: expected, and the saved copy
    // is untouched. The next page opened tries again.
    event.waitUntil(update().catch(() => {}));
  }
});
