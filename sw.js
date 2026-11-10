// Service worker: makes the site work with no signal after the first visit.
//
// The whole site is saved as one copy. Requests are answered from the copy in
// use. Each time a page is opened, the site is downloaded again in the
// background into a second, separate copy. That copy is only marked ready
// once every file has fully arrived, and is only switched to when the next
// page is opened. So a dropped signal leaves the old copy untouched, and a
// page that is loading never gets some old files and some new ones.
//
// A published change therefore shows up on the second page opened after it
// is published: the first fetches it, the next uses it.
//
// When you add a page, script, or stylesheet, add it to ASSETS. The test in
// tests/offline.test.js fails if one is missing.

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

// Each saved copy is a cache named landnav-<time saved>. The READY entry is
// written last, so a copy without it is incomplete and is never served.
const PREFIX = 'landnav-';
const READY = '__ready';

const urlOf = (asset) => new URL(asset, self.location.href).href;
const stamp = (name) => Number(name.slice(PREFIX.length));

let live = null; // name of the copy being served
let updating = null; // set while an update runs, so two pages start only one

/** Names of the complete copies, oldest first. */
async function readyCopies() {
  const names = (await caches.keys())
    .filter((name) => name.startsWith(PREFIX) && Number.isFinite(stamp(name)))
    .sort((a, b) => stamp(a) - stamp(b));
  const ready = [];
  for (const name of names) {
    const cache = await caches.open(name);
    if (await cache.match(urlOf(READY))) ready.push(name);
  }
  return ready;
}

/** A page is being opened: switch to the newest complete copy, drop older ones. */
async function promote() {
  const ready = await readyCopies();
  if (ready.length > 0) live = ready[ready.length - 1];
  if (!live) return;
  // Older copies, and caches from earlier versions of this worker. Anything
  // newer than the copy in use is an update still being written; leave it.
  const stale = (await caches.keys()).filter(
    (name) => name.startsWith(PREFIX) && name !== live && !(stamp(name) > stamp(live)),
  );
  await Promise.all(stale.map((name) => caches.delete(name)));
}

/**
 * The worker was restarted while a page was open. That page was using the
 * oldest complete copy; a newer one, if any, is waiting for the next page.
 */
async function resume() {
  const ready = await readyCopies();
  live = ready[0] || null;
}

function sameBytes(a, b) {
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  return x.length === y.length && x.every((value, i) => value === y[i]);
}

/** True if the newest saved copy already holds exactly these files. */
async function alreadySaved(bodies) {
  const ready = await readyCopies();
  if (ready.length === 0) return false;
  const cache = await caches.open(ready[ready.length - 1]);
  for (let i = 0; i < ASSETS.length; i += 1) {
    const saved = await cache.match(urlOf(ASSETS[i]));
    if (!saved || !sameBytes(await saved.arrayBuffer(), bodies[i])) return false;
  }
  return true;
}

/** Download the whole site and save it as a new copy. All or nothing. */
async function saveCopy() {
  const responses = await Promise.all(ASSETS.map((asset) => fetch(urlOf(asset), { cache: 'no-cache' })));
  const missing = ASSETS.filter((asset, i) => !responses[i].ok);
  if (missing.length > 0) throw new Error(`Could not fetch: ${missing.join(', ')}`);

  // Read every file to the end before saving any of them. A signal that
  // drops partway through a download fails here, with nothing written.
  const bodies = await Promise.all(responses.map((response) => response.arrayBuffer()));
  if (await alreadySaved(bodies)) return;

  const ready = await readyCopies();
  const newest = ready.length > 0 ? stamp(ready[ready.length - 1]) : 0;
  const name = PREFIX + Math.max(Date.now(), newest + 1);
  try {
    const cache = await caches.open(name);
    await Promise.all(
      bodies.map((body, i) => cache.put(urlOf(ASSETS[i]), new Response(body, { headers: responses[i].headers }))),
    );
    await cache.put(urlOf(READY), new Response('ready'));
  } catch (error) {
    await caches.delete(name);
    throw error;
  }
}

function update() {
  if (!updating) {
    updating = saveCopy().finally(() => {
      updating = null;
    });
  }
  return updating;
}

self.addEventListener('install', (event) => {
  event.waitUntil(saveCopy().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function respond(request, opening) {
  if (opening) await promote();
  else if (!live) await resume();

  if (live) {
    const cache = await caches.open(live);
    // ignoreSearch: worksheet.html?n=1234 is the same file as worksheet.html.
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
  }
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const opening = request.mode === 'navigate';
  event.respondWith(respond(request, opening));

  if (opening) {
    // A failed update is the normal case with no signal. Nothing was saved,
    // the copy in use is untouched, and the next page opened tries again.
    event.waitUntil(update().catch(() => {}));
  }
});
