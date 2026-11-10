import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pacesForDistance, distanceFromPaces } from '../js/pace.js';

// A pace count is the number of paces (every time the same foot strikes) it
// takes one person to walk 100 meters. FM 3-25.26, chapter 5.

test('paces for a distance scale from the 100 m count', () => {
  assert.equal(pacesForDistance(66, 100).total, 66);
  assert.equal(pacesForDistance(66, 300).total, 198);
  assert.equal(pacesForDistance(66, 50).total, 33);
  assert.equal(pacesForDistance(66, 0).total, 0);
});

test('paces are rounded to a whole pace', () => {
  assert.equal(pacesForDistance(65, 150).total, 98); // 97.5 rounds up
  assert.equal(pacesForDistance(63, 10).total, 6); // 6.3 rounds down
});

test('a distance is broken into full 100 m legs plus leftover paces', () => {
  const r = pacesForDistance(66, 350);
  assert.equal(r.hundreds, 3);
  assert.equal(r.remainderMeters, 50);
  assert.equal(r.remainderPaces, 33);
  assert.equal(r.total, 231);

  const exact = pacesForDistance(66, 400);
  assert.equal(exact.hundreds, 4);
  assert.equal(exact.remainderMeters, 0);
  assert.equal(exact.remainderPaces, 0);
});

test('distance walked comes back from paces counted', () => {
  assert.equal(distanceFromPaces(66, 66), 100);
  assert.equal(distanceFromPaces(66, 198), 300);
  assert.equal(distanceFromPaces(66, 33), 50);
  assert.equal(distanceFromPaces(62, 100), 161); // 161.29 to the nearest meter
});

test('pace math rejects a missing or non-positive pace count', () => {
  assert.throws(() => pacesForDistance(0, 100), RangeError);
  assert.throws(() => pacesForDistance(-5, 100), RangeError);
  assert.throws(() => pacesForDistance(NaN, 100), RangeError);
  assert.throws(() => distanceFromPaces(0, 100), RangeError);
});

test('pace math rejects a negative distance or pace total', () => {
  assert.throws(() => pacesForDistance(66, -1), RangeError);
  assert.throws(() => pacesForDistance(66, NaN), RangeError);
  assert.throws(() => distanceFromPaces(66, -1), RangeError);
});

// ---- Added after review ----

test('leftover paces are rounded to the nearest pace, not cut off', () => {
  const r = pacesForDistance(65, 150);
  assert.equal(r.hundreds, 1);
  assert.equal(r.remainderPaces, 33); // 32.5 rounds up
});

test('the unrounded figure is reported so the work can say when it rounded', () => {
  const rounded = pacesForDistance(67, 150);
  assert.equal(rounded.exact, 100.5);
  assert.equal(rounded.total, 101);
  assert.equal(rounded.rounded, true);

  const whole = pacesForDistance(66, 350);
  assert.equal(whole.exact, 231);
  assert.equal(whole.rounded, false);
});
