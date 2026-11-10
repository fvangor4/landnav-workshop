import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs sw.js against a fake network and cache, to check what a phone actually
// gets: the saved copy with no signal, and updates that arrive whole or not
// at all.

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://example.test/site/';

function startWorker() {
  const listeners = {};
  const network = new Map(); // absolute URL -> body; missing means 404
  let online = true;
  const stores = new Map(); // cache name -> Map(absolute URL -> body)
  const urlOf = (target) => new URL(typeof target === 'string' ? target : target.url, SCOPE);

  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(target, { ignoreSearch = false } = {}) {
          const url = urlOf(target);
          if (ignoreSearch) url.search = '';
          return store.has(url.href) ? new Response(store.get(url.href)) : undefined;
        },
        async put(target, response) {
          store.set(urlOf(target).href, await response.text());
        },
      };
    },
    async keys() {
      return [...stores.keys()];
    },
    async delete(name) {
      return stores.delete(name);
    },
  };

  const fetch = async (target) => {
    if (!online) throw new TypeError('offline');
    const { href } = urlOf(target);
    return network.has(href) ? new Response(network.get(href)) : new Response('missing', { status: 404 });
  };

  const self = {
    location: new URL('sw.js', SCOPE),
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  vm.runInNewContext(source, { self, caches, fetch, URL, Response, Promise, Date, Error });

  const assets = JSON.parse(
    source.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'),
  ).map((asset) => new URL(asset, SCOPE).href);

  /** Dispatch an event; resolves to the response once background work is done. */
  async function dispatch(type, request) {
    const waits = [];
    let responded;
    listeners[type]({
      request,
      waitUntil: (promise) => waits.push(promise),
      respondWith: (promise) => {
        responded = promise;
      },
    });
    const response = responded === undefined ? undefined : await responded;
    await Promise.all(waits);
    return response;
  }

  return {
    assets,
    publish: (version) => assets.forEach((href) => network.set(href, `${version}:${href}`)),
    unpublish: (path) => network.delete(new URL(path, SCOPE).href),
    setOnline: (value) => {
      online = value;
    },
    install: () => dispatch('install'),
    visit: (path, mode = 'navigate') => dispatch('fetch', { url: new URL(path, SCOPE).href, method: 'GET', mode }),
    request: (request) => dispatch('fetch', request),
    cached: (path) => (stores.get('landnav-v1') || new Map()).get(new URL(path, SCOPE).href),
    cacheSize: () => (stores.get('landnav-v1') || new Map()).size,
  };
}

const text = async (response) => (response ? response.text() : undefined);

test('install saves every asset', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  assert.equal(worker.cacheSize(), worker.assets.length);
  assert.ok(worker.cached('tools.html').startsWith('v1:'));
});

test('install fails, saving nothing, when an asset is missing', async () => {
  const worker = startWorker();
  worker.publish('v1');
  worker.unpublish('js/grid.js');
  await assert.rejects(worker.install());
  assert.equal(worker.cacheSize(), 0);
});

test('with no signal, pages come from the saved copy', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.setOnline(false);
  assert.ok((await text(await worker.visit('tools.html'))).startsWith('v1:'));
  assert.ok((await text(await worker.visit('./'))).startsWith('v1:'));
  assert.ok((await text(await worker.visit('js/grid.js', 'cors'))).startsWith('v1:'));
});

test('a worksheet address with a number is served from the saved worksheet page', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.setOnline(false);
  const body = await text(await worker.visit('worksheet.html?n=1234&gm=8&dir=east'));
  assert.equal(body, worker.cached('worksheet.html'));
});

test('a visit is answered from the saved copy, then the whole site is updated', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.publish('v2');
  const body = await text(await worker.visit('index.html'));
  assert.ok(body.startsWith('v1:'), 'this visit still sees the saved copy');
  for (const href of worker.assets) {
    assert.ok(worker.cached(href).startsWith('v2:'), `${href} was not updated`);
  }
});

test('an update that cannot be fetched whole changes nothing', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.publish('v2');
  worker.unpublish('js/azimuth.js'); // one file fails mid-update
  await worker.visit('index.html');
  for (const href of worker.assets) {
    assert.ok(worker.cached(href).startsWith('v1:'), `${href} was updated on its own`);
  }
});

test('a failed update is tried again on the next visit', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.setOnline(false);
  await worker.visit('index.html');
  worker.setOnline(true);
  worker.publish('v2');
  await worker.visit('index.html');
  assert.ok(worker.cached('index.html').startsWith('v2:'));
});

test('loading a script or stylesheet does not start an update', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  worker.publish('v2');
  await worker.visit('js/grid.js', 'cors');
  assert.ok(worker.cached('js/grid.js').startsWith('v1:'));
});

test('requests to other sites and non-GET requests are left alone', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  assert.equal(await worker.request({ url: 'https://elsewhere.test/x.js', method: 'GET', mode: 'cors' }), undefined);
  assert.equal(await worker.request({ url: `${SCOPE}index.html`, method: 'POST', mode: 'cors' }), undefined);
});

test('a same-site file that is not saved falls through to the network', async () => {
  const worker = startWorker();
  worker.publish('v1');
  await worker.install();
  const response = await worker.visit('not-a-page.html', 'cors');
  assert.equal(response.status, 404);
});
