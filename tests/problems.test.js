import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, makeWorksheet } from '../js/problems.js';
import { gridToMagnetic, magneticToGrid, backAzimuth } from '../js/azimuth.js';
import { pacesForDistance, distanceFromPaces } from '../js/pace.js';
import { gridFor } from '../js/grid.js';

const options = { gmAngle: 8, direction: 'east' };

test('seeded random source repeats and stays in [0, 1)', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 200; i += 1) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
  assert.notEqual(createRng(1)(), createRng(2)());
});

test('the same seed always produces the same worksheet', () => {
  assert.deepEqual(makeWorksheet(1234, options), makeWorksheet(1234, options));
});

test('different seeds produce different worksheets', () => {
  assert.notDeepEqual(
    makeWorksheet(1234, options).problems,
    makeWorksheet(1235, options).problems,
  );
});

test('a worksheet has a fixed mix of problem types, numbered in order', () => {
  const { problems } = makeWorksheet(7, options);
  const count = (type) => problems.filter((p) => p.type === type).length;
  assert.equal(count('grid-to-magnetic'), 3);
  assert.equal(count('magnetic-to-grid'), 3);
  assert.equal(count('back-azimuth'), 4);
  assert.equal(count('paces-for-distance'), 3);
  assert.equal(count('distance-from-paces'), 2);
  assert.equal(count('grid-coordinate'), 4);
  assert.deepEqual(problems.map((p) => p.number), problems.map((_, i) => i + 1));
});

test('every answer matches the math modules', () => {
  for (const seed of [1, 99, 2026]) {
    for (const direction of ['east', 'west']) {
      const { problems } = makeWorksheet(seed, { gmAngle: 11.5, direction });
      for (const p of problems) {
        const g = p.given;
        const expected = {
          'grid-to-magnetic': () => gridToMagnetic(g.azimuth, 11.5, direction).value,
          'magnetic-to-grid': () => magneticToGrid(g.azimuth, 11.5, direction).value,
          'back-azimuth': () => backAzimuth(g.azimuth).value,
          'paces-for-distance': () => pacesForDistance(g.paceCount, g.meters).total,
          'distance-from-paces': () => distanceFromPaces(g.paceCount, g.paces),
          'grid-coordinate': () => gridFor(g.point, g.digits),
        }[p.type]();
        assert.equal(p.answerValue, expected, `problem ${p.number} (${p.type})`);
        assert.ok(p.answer.replace(/\s/g, '').includes(String(p.answerValue)));
        assert.ok(p.question.length > 0);
      }
    }
  }
});

test('each conversion set includes one problem that wraps past north', () => {
  for (const direction of ['east', 'west']) {
    const { problems } = makeWorksheet(5, { gmAngle: 8, direction });
    const wraps = (type, convert) =>
      problems
        .filter((p) => p.type === type)
        .some((p) => convert(p.given.azimuth, 8, direction).wrapped);
    assert.ok(wraps('grid-to-magnetic', gridToMagnetic));
    assert.ok(wraps('magnetic-to-grid', magneticToGrid));
  }
});

test('grid problems ask for both 6- and 8-digit coordinates', () => {
  const { problems } = makeWorksheet(3, options);
  const digits = problems.filter((p) => p.type === 'grid-coordinate').map((p) => p.given.digits);
  assert.deepEqual(digits.sort(), [6, 6, 8, 8]);
});

test('the worksheet records its seed and G-M angle for reprints', () => {
  const sheet = makeWorksheet(88, { gmAngle: 8, direction: 'west' });
  assert.equal(sheet.seed, 88);
  assert.equal(sheet.gmAngle, 8);
  assert.equal(sheet.direction, 'west');
});

test('a worksheet needs a whole-number seed and a valid G-M angle', () => {
  assert.throws(() => makeWorksheet(1.5, options), RangeError);
  assert.throws(() => makeWorksheet(NaN, options), RangeError);
  assert.throws(() => makeWorksheet(1, { gmAngle: -3, direction: 'east' }), RangeError);
  assert.throws(() => makeWorksheet(1, { gmAngle: 8, direction: 'up' }), RangeError);
});
