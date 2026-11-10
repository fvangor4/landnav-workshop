import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridFor, makePoint, checkAnswer } from '../js/grid.js';

// A point is { easting, northing, x, y }: the grid lines at the lower-left
// corner of its 1,000 m square, and its offset in meters to the right (x)
// and up (y) from that corner. Read right, then up; never round up.

const point = { easting: 11, northing: 43, x: 478, y: 263 };

test('4-digit grid names the 1,000 m square', () => {
  assert.equal(gridFor(point, 4), '1143');
});

test('6-digit grid adds the 100 m digit, truncated', () => {
  assert.equal(gridFor(point, 6), '114432');
});

test('8-digit grid adds the 10 m digit, truncated', () => {
  assert.equal(gridFor(point, 8), '11474326');
});

test('grid lines below 10 keep their leading zero', () => {
  assert.equal(gridFor({ easting: 5, northing: 9, x: 30, y: 990 }, 8), '05030999');
});

test('grid digits are truncated, not rounded up', () => {
  const nearNextLine = { easting: 11, northing: 43, x: 499, y: 299 };
  assert.equal(gridFor(nearNextLine, 6), '114432');
  assert.equal(gridFor(nearNextLine, 8), '11494329');
});

test('gridFor rejects an unsupported precision', () => {
  assert.throws(() => gridFor(point, 5), RangeError);
  assert.throws(() => gridFor(point, 10), RangeError);
});

test('a correct answer is accepted, with or without a space', () => {
  assert.equal(checkAnswer('1143', point, 4).correct, true);
  assert.equal(checkAnswer('114432', point, 6).correct, true);
  assert.equal(checkAnswer('114 432', point, 6).correct, true);
  assert.equal(checkAnswer(' 1147 4326 ', point, 8).correct, true);
});

test('a 6-digit answer one digit off is rejected', () => {
  const r = checkAnswer('115432', point, 6);
  assert.equal(r.correct, false);
  assert.equal(r.reason, 'wrong');
  assert.equal(r.expected, '114432');
});

test('an 8-digit answer within 1 in the last digit is accepted', () => {
  assert.equal(checkAnswer('11484326', point, 8).correct, true);
  assert.equal(checkAnswer('11464327', point, 8).correct, true);
  assert.equal(checkAnswer('11474325', point, 8).correct, true);
});

test('an 8-digit answer 2 off in the last digit is rejected', () => {
  assert.equal(checkAnswer('11494326', point, 8).correct, false);
  assert.equal(checkAnswer('11474324', point, 8).correct, false);
});

test('an answer with the wrong number of digits is a format error', () => {
  assert.equal(checkAnswer('1143', point, 6).reason, 'format');
  assert.equal(checkAnswer('11443', point, 6).reason, 'format');
  assert.equal(checkAnswer('', point, 6).reason, 'format');
  assert.equal(checkAnswer('11A432', point, 6).reason, 'format');
});

test('reading up before right is flagged as reversed', () => {
  assert.equal(checkAnswer('4311', point, 4).reason, 'reversed');
  assert.equal(checkAnswer('432114', point, 6).reason, 'reversed');
  assert.equal(checkAnswer('43261147', point, 8).reason, 'reversed');
});

test('generated points stay inside a square and clear of the 100 m lines', () => {
  let seed = 1;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 500; i += 1) {
    const p = makePoint(rng);
    assert.ok(Number.isInteger(p.easting) && p.easting >= 0 && p.easting <= 99);
    assert.ok(Number.isInteger(p.northing) && p.northing >= 0 && p.northing <= 99);
    for (const offset of [p.x, p.y]) {
      assert.ok(offset >= 0 && offset < 1000);
      // At least 20 m from a 100 m line, so the 6-digit answer is unambiguous
      // and an 8-digit answer within tolerance never crosses a 100 m line.
      const within = offset % 100;
      assert.ok(within >= 20 && within < 80, `offset ${offset} too close to a line`);
    }
  }
});

test('makePoint is driven by the supplied random source', () => {
  const fixed = () => 0.5;
  assert.deepEqual(makePoint(fixed), makePoint(fixed));
  assert.notDeepEqual(makePoint(() => 0.1), makePoint(() => 0.9));
});
