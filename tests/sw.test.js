import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs sw.js against a fake network and cache storage, to check what a phone
// actually gets: the saved copy with no signal, and updates that arrive whole
// or not at all, never mixed into a page that is loading.

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://example.test/site/';
const ASSETS = JSON.parse(
  source.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'),
).map((asset) => new URL(asset, SCOPE).href);

const urlOf = (target) => new URL(typeof target === 'string' ? target : target.url, SCOPE);

/** The network and the phone's cache storage. Both outlive a worker restart. */
function createWorld() {
  const network = new Map(); // absolute URL -> body; missing means 404
  const stores = new Map(); // cache name -> Map(absolute URL -> { body, headers })
  const world = {
    network,
    stores,
    online: true,
    calls: [], // every fetch: { href, options }
    brokenBodies: new Set(), // hrefs whose download dies after the headers
    failingPuts: new Set(), // hrefs the phone refuses to save (storage full)
    putGates: new Map(), // href -> promise a save waits on (a write in progress)
    // A CDN in front of the site (GitHub Pages has one) keeps its own copy of
    // each address for a while after a publish, and does not refresh them all
    // at once. href -> the old body it still serves for that address.
    cdn: new Map(),
    gate: null, // when set, bodies wait on this promise before arriving
    publish: (version) => ASSETS.forEach((href) => network.set(href, `${version}:${href}`)),
    unpublish: (path) => network.delete(new URL(path, SCOPE).href),
    breakBody: (path) => world.brokenBodies.add(new URL(path, SCOPE).href),
  };
  return world;
}

function startWorker(world = createWorld(), scope = SCOPE) {
  const listeners = {};

  const caches = {
    async open(name) {
      if (!world.stores.has(name)) world.stores.set(name, new Map());
      const store = world.stores.get(name);
      return {
        async match(target, { ignoreSearch = false } = {}) {
          const url = urlOf(target);
          if (ignoreSearch) url.search = '';
          const entry = store.get(url.href);
          return entry ? new Response(entry.body, { headers: entry.headers }) : undefined;
        },
        async put(target, response) {
          const { href } = urlOf(target);
          if (world.failingPuts.has(href)) throw new Error('storage full');
          if (world.putGates.has(href)) await world.putGates.get(href);
          store.set(href, {
            body: await response.arrayBuffer(),
            headers: [...response.headers],
          });
        },
      };
    },
    async keys() {
      return [...world.stores.keys()];
    },
    async delete(name) {
      return world.stores.delete(name);
    },
  };

  const fetch = async (target, options = {}) => {
    const requested = urlOf(target);
    const { search } = requested;
    requested.search = '';
    const { href } = requested;
    world.calls.push({ href, search, options });
    if (!world.online) throw new TypeError('offline');
    if (!world.network.has(href)) return new Response('missing', { status: 404 });

    // The CDN keys its copies by the full address, query string included.
    const text = !search && world.cdn.has(href) ? world.cdn.get(href) : world.network.get(href);
    const broken = world.brokenBodies.has(href);
    const gate = world.gate;
    const body = new ReadableStream({
      async start(controller) {
        if (gate) await gate;
        if (broken) controller.error(new TypeError('connection lost'));
        else {
          controller.enqueue(new TextEncoder().encode(text));
          controller.close();
        }
      },
    });
    return new Response(body, { headers: { 'content-type': 'text/javascript' } });
  };

  const self = {
    location: new URL('sw.js', scope),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  vm.runInNewContext(source, { self, caches, fetch, URL, Response, Promise, Date, Error, Number, Math, Uint8Array });

  /** Dispatch an event. `response` is what the page gets; `settled` waits for background work. */
  function dispatch(type, request) {
    const waits = [];
    let responded;
    listeners[type]({
      request,
      waitUntil: (promise) => waits.push(promise),
      respondWith: (promise) => {
        responded = promise;
      },
    });
    return {
      response: responded === undefined ? Promise.resolve(undefined) : responded,
      settled: Promise.all(waits),
    };
  }

  const get = (path, mode) => dispatch('fetch', { url: new URL(path, scope).href, method: 'GET', mode });
  const bodyOf = async (pending) => {
    const response = await pending;
    return response ? response.text() : undefined;
  };

  return {
    world,
    install: () => dispatch('install').settled,
    /** Open a page: resolves to its body once the background update has finished. */
    async open(path) {
      const event = get(path, 'navigate');
      const body = await bodyOf(event.response);
      await event.settled;
      return body;
    },
    /** Open a page without waiting for the background update. */
    openWithoutWaiting(path) {
      const event = get(path, 'navigate');
      return { body: bodyOf(event.response), settled: event.settled };
    },
    /** A script, stylesheet, or other file requested by a page that is already open. */
    load: (path) => bodyOf(get(path, 'cors').response),
    loadResponse: (path) => get(path, 'cors').response,
    request: (request) => dispatch('fetch', request).response,
  };
}

/** A phone that has visited once while v1 was published. */
async function installed() {
  const worker = startWorker();
  worker.world.publish('v1');
  await worker.install();
  await worker.open('index.html'); // unchanged site: nothing new to save
  return worker;
}

const versionsServed = async (worker) =>
  new Set(await Promise.all(ASSETS.map(async (href) => (await worker.load(href)).split(':')[0])));

test('install saves every asset', async () => {
  const worker = startWorker();
  worker.world.publish('v1');
  await worker.install();
  worker.world.online = false;
  assert.ok((await worker.open('index.html')).startsWith('v1:'));
  for (const href of ASSETS) assert.equal(await worker.load(href), `v1:${href}`);
});

test('install fails, saving nothing usable, when an asset is missing', async () => {
  const worker = startWorker();
  worker.world.publish('v1');
  worker.world.unpublish('js/grid.js');
  await assert.rejects(worker.install());
  worker.world.online = false;
  await assert.rejects(worker.open('index.html'), /offline/);
});

test('with no signal, pages and their files come from the saved copy', async () => {
  const worker = await installed();
  worker.world.online = false;
  assert.ok((await worker.open('tools.html')).startsWith('v1:'));
  assert.ok((await worker.open('./')).startsWith('v1:'));
  assert.ok((await worker.load('js/grid.js')).startsWith('v1:'));
});

test('a worksheet address with a number is served from the saved worksheet page', async () => {
  const worker = await installed();
  worker.world.online = false;
  assert.equal(await worker.open('worksheet.html?n=1234&gm=8&dir=east'), await worker.load('worksheet.html'));
});

test('saved files keep their content type', async () => {
  const worker = await installed();
  worker.world.online = false;
  const response = await worker.loadResponse('js/grid.js');
  assert.equal(response.headers.get('content-type'), 'text/javascript');
});

test('an update is fetched in the background and used whole from the next page opened', async () => {
  const worker = await installed();
  worker.world.publish('v2');

  assert.ok((await worker.open('index.html')).startsWith('v1:'), 'this visit still gets the saved copy');
  assert.deepEqual(await versionsServed(worker), new Set(['v1']), 'and so do the files that page loads');

  assert.ok((await worker.open('tools.html')).startsWith('v2:'), 'the next page opened gets the update');
  assert.deepEqual(await versionsServed(worker), new Set(['v2']));
});

test('an update with a missing file changes nothing', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  worker.world.unpublish('js/azimuth.js');
  await worker.open('index.html');
  worker.world.online = false;
  assert.ok((await worker.open('tools.html')).startsWith('v1:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v1']));
});

test('an update whose download dies partway changes nothing', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  worker.world.breakBody('js/azimuth.js'); // headers arrive, then the signal drops
  await worker.open('index.html');
  worker.world.online = false;
  assert.ok((await worker.open('tools.html')).startsWith('v1:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v1']));
});

test('a page that is loading while an update arrives never gets a mix of old and new files', async () => {
  const worker = await installed();
  worker.world.publish('v2');

  let release;
  worker.world.gate = new Promise((resolve) => {
    release = resolve;
  });
  const visit = worker.openWithoutWaiting('index.html');
  assert.ok((await visit.body).startsWith('v1:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v1']), 'while the update is downloading');

  release();
  await visit.settled;
  assert.deepEqual(await versionsServed(worker), new Set(['v1']), 'after the update has been saved');

  worker.world.gate = null;
  assert.ok((await worker.open('index.html')).startsWith('v2:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v2']));
});

test('a restarted worker keeps serving the copy the open page was using', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  await worker.open('index.html'); // v2 is now saved, waiting for the next page

  const restarted = startWorker(worker.world);
  assert.deepEqual(await versionsServed(restarted), new Set(['v1']));
  assert.ok((await restarted.open('index.html')).startsWith('v2:'));
});

test('a failed update is tried again on the next page opened', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  worker.world.online = false;
  await worker.open('index.html');
  worker.world.online = true;
  await worker.open('index.html'); // fetches v2
  assert.ok((await worker.open('index.html')).startsWith('v2:'));
});

test('only one saved copy is kept once an update is in use', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  await worker.open('index.html');
  assert.equal(worker.world.stores.size, 2, 'the update waits beside the copy in use');
  await worker.open('index.html');
  assert.equal(worker.world.stores.size, 1);
});

test('an unchanged site is not saved again', async () => {
  const worker = await installed();
  const before = [...worker.world.stores.keys()];
  await worker.open('index.html');
  await worker.open('tools.html');
  assert.deepEqual([...worker.world.stores.keys()], before);
});

test('a copy that could not be fully saved is thrown away, not left behind', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  worker.world.failingPuts.add(`${SCOPE}js/azimuth.js`);
  await worker.open('index.html');
  assert.equal(worker.world.stores.size, 1, 'the half-written copy was deleted');
  assert.ok((await worker.open('tools.html')).startsWith('v1:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v1']));
});

test('a copy that is still being written is never served, and is not deleted', async () => {
  const worker = await installed();
  worker.world.publish('v2');

  let finishWrite;
  worker.world.putGates.set(
    `${SCOPE}js/azimuth.js`,
    new Promise((resolve) => {
      finishWrite = resolve;
    }),
  );
  const visit = worker.openWithoutWaiting('index.html');
  await visit.body;
  await new Promise((resolve) => setTimeout(resolve, 20)); // every other file is now written

  // Another page opens while one file of the update is still being saved.
  const second = worker.openWithoutWaiting('tools.html');
  assert.ok((await second.body).startsWith('v1:'), 'the unfinished copy is not used');
  assert.deepEqual(await versionsServed(worker), new Set(['v1']));

  finishWrite();
  await Promise.all([visit.settled, second.settled]);
  worker.world.putGates.clear();
  assert.ok((await worker.open('index.html')).startsWith('v2:'), 'the finished copy survived and is used');
  assert.deepEqual(await versionsServed(worker), new Set(['v2']));
});

test('two copies of the site on one web address do not touch each other', async () => {
  // GitHub project sites share an origin: user.github.io/site/ and /other/.
  const world = createWorld();
  const otherScope = 'https://example.test/other/';
  const otherAssets = ASSETS.map((href) => href.replace(SCOPE, otherScope));
  ASSETS.forEach((href) => world.network.set(href, `v1:${href}`));
  otherAssets.forEach((href) => world.network.set(href, `other:${href}`));

  const first = startWorker(world, SCOPE);
  await first.install();
  await first.open('index.html');
  const second = startWorker(world, otherScope);
  await second.install();
  await second.open('index.html');
  await second.open('tools.html');

  world.online = false;
  assert.ok((await first.open('index.html')).startsWith('v1:'));
  assert.deepEqual(await versionsServed(first), new Set(['v1']));
  assert.ok((await second.open('index.html')).startsWith('other:'));
  assert.equal(world.stores.size, 2, 'each site keeps its own copy');
});

test('update requests bypass the browser cache and the CDN, so stale files are not saved', async () => {
  const worker = await installed();
  worker.world.calls.length = 0;
  await worker.open('index.html');
  const updates = worker.world.calls.filter((call) => ASSETS.includes(call.href));
  assert.equal(updates.length, ASSETS.length);
  for (const call of updates) {
    assert.equal(call.options.cache, 'no-store', call.href);
    assert.ok(call.search, `${call.href} was fetched without a query, so the CDN can answer it`);
  }
});

test('files the CDN still holds from before a publish are not mixed into an update', async () => {
  const worker = await installed();
  worker.world.publish('v2');
  // Right after a publish: the page is new at the CDN, the stylesheet and a
  // script are not yet.
  for (const path of ['css/styles.css', 'js/site.js']) {
    const href = new URL(path, SCOPE).href;
    worker.world.cdn.set(href, `v1:${href}`);
  }
  await worker.open('index.html');
  assert.ok((await worker.open('index.html')).startsWith('v2:'));
  assert.deepEqual(await versionsServed(worker), new Set(['v2']));
});

test('two pages opened at once start a single update', async () => {
  const worker = await installed();
  worker.world.calls.length = 0;
  const first = worker.openWithoutWaiting('index.html');
  const second = worker.openWithoutWaiting('tools.html');
  await Promise.all([first.settled, second.settled]);
  assert.equal(worker.world.calls.length, ASSETS.length);
});

test('loading a script or stylesheet does not start an update', async () => {
  const worker = await installed();
  worker.world.calls.length = 0;
  await worker.load('js/grid.js');
  assert.equal(worker.world.calls.length, 0);
});

test('requests to other sites and non-GET requests are left alone', async () => {
  const worker = await installed();
  assert.equal(await worker.request({ url: 'https://elsewhere.test/x.js', method: 'GET', mode: 'cors' }), undefined);
  assert.equal(await worker.request({ url: `${SCOPE}index.html`, method: 'POST', mode: 'cors' }), undefined);
});

test('a same-site file that is not saved falls through to the network', async () => {
  const worker = await installed();
  const response = await worker.loadResponse('not-a-page.html');
  assert.equal(response.status, 404);
});
