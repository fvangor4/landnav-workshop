import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// The service worker can only serve what it was told to cache. These tests
// fail when a page, script, or stylesheet is added without listing it, which
// would otherwise leave a hole that only shows up with no signal.

const root = fileURLToPath(new URL('..', import.meta.url));
const worker = readFileSync(join(root, 'sw.js'), 'utf8');
const listed = JSON.parse(
  worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'),
);

test('every cached asset exists', () => {
  for (const asset of listed) {
    const file = asset === './' ? 'index.html' : asset;
    assert.ok(existsSync(join(root, file)), `${asset} is listed in sw.js but missing`);
  }
});

test('every page, script, and stylesheet is cached for offline use', () => {
  const shipped = [
    ...readdirSync(root).filter((name) => name.endsWith('.html')),
    ...readdirSync(join(root, 'js')).map((name) => `js/${name}`),
    ...readdirSync(join(root, 'css')).map((name) => `css/${name}`),
    'manifest.webmanifest',
    'icon.svg',
  ];
  for (const file of shipped) {
    assert.ok(listed.includes(file), `${file} is not listed in sw.js`);
  }
  assert.ok(listed.includes('./'), 'the site root is not listed in sw.js');
});

test('every page loads the shared script that registers the service worker', () => {
  for (const page of readdirSync(root).filter((name) => name.endsWith('.html'))) {
    const html = readFileSync(join(root, page), 'utf8');
    assert.ok(html.includes('<script src="js/site.js"></script>'), `${page} does not load js/site.js`);
    assert.ok(html.includes('rel="manifest"'), `${page} does not link the manifest`);
    assert.ok(
      html.includes('<p data-offline-state></p>'),
      `${page} has no line saying whether the device has an offline copy`,
    );
  }
  const site = readFileSync(join(root, 'js/site.js'), 'utf8');
  assert.ok(/serviceWorker\.register\(['"]sw\.js['"]\)/.test(site), 'js/site.js does not register sw.js');
});
