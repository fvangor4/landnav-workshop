import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirection, presetGm, presetProblem, startingGm, gmToStore, worksheetStart } from '../js/settings.js';

const preset = { name: 'Test sheet', gmAngle: 8, direction: 'east' };
const noPreset = { name: '', gmAngle: null, direction: 'east' };

test('a direction is read whatever its case, and anything else is refused', () => {
  assert.equal(parseDirection('west'), 'west');
  assert.equal(parseDirection('West'), 'west');
  assert.equal(parseDirection(' WESTERLY '), 'west');
  assert.equal(parseDirection('w'), 'west');
  assert.equal(parseDirection('East'), 'east');
  assert.equal(parseDirection('easterly'), 'east');
  assert.equal(parseDirection('E'), 'east');
  assert.equal(parseDirection('north'), null);
  assert.equal(parseDirection(''), null);
  assert.equal(parseDirection(undefined), null);
});

test('the class map preset keeps the direction the instructor meant', () => {
  assert.deepEqual(presetGm(preset), { angle: 8, direction: 'east' });
  assert.deepEqual(presetGm({ gmAngle: 11, direction: 'West' }), { angle: 11, direction: 'west' });
  assert.deepEqual(presetGm({ gmAngle: 11, direction: 'W' }), { angle: 11, direction: 'west' });
});

test('a preset that cannot be read is not used, and says why', () => {
  assert.equal(presetGm(noPreset), null);
  assert.equal(presetProblem(noPreset), null); // not set is not a mistake

  for (const bad of [
    { gmAngle: 8, direction: 'north' },
    { gmAngle: 8 },
    { gmAngle: -4, direction: 'east' },
    { gmAngle: 180, direction: 'east' },
    { gmAngle: 8.25, direction: 'east' },
    { gmAngle: '8', direction: 'east' },
  ]) {
    assert.equal(presetGm(bad), null, JSON.stringify(bad));
    assert.equal(typeof presetProblem(bad), 'string', JSON.stringify(bad));
  }
  assert.match(presetProblem({ gmAngle: 8, direction: 'north' }), /direction/);
  assert.match(presetProblem({ gmAngle: 200, direction: 'east' }), /gmAngle/);
  assert.equal(presetProblem(preset), null);
});

test('with nothing saved, the tools start from the class map', () => {
  assert.deepEqual(startingGm(null, preset), { angle: 8, direction: 'east' });
  assert.deepEqual(startingGm(null, noPreset), { angle: null, direction: 'east' });
  assert.deepEqual(startingGm({ angle: 'x' }, preset), { angle: 8, direction: 'east' });
  assert.deepEqual(startingGm({ angle: 12, direction: 'sideways' }, preset), { angle: 8, direction: 'east' });
});

test("a student's own saved value wins over the class map", () => {
  assert.deepEqual(startingGm({ angle: 12, direction: 'west' }, preset), { angle: 12, direction: 'west' });
});

test('the class map value itself is never saved, so a changed preset reaches returning phones', () => {
  assert.equal(gmToStore(8, 'east', preset), null);
  assert.deepEqual(gmToStore(8, 'west', preset), { angle: 8, direction: 'west' });
  assert.deepEqual(gmToStore(12, 'east', preset), { angle: 12, direction: 'east' });
  assert.deepEqual(gmToStore(8, 'east', noPreset), { angle: 8, direction: 'east' });
});

test('clearing the G-M box clears the saved value', () => {
  assert.equal(gmToStore(null, 'east', preset), null);
  assert.equal(gmToStore(null, 'west', noPreset), null);
});

test('a worksheet address restores its number, G-M angle, and direction', () => {
  assert.deepEqual(worksheetStart('?n=1234&gm=11.5&dir=west', preset, () => 5), {
    number: 1234,
    gmAngle: 11.5,
    direction: 'west',
  });
  assert.deepEqual(worksheetStart('?n=0&gm=0&dir=east', preset, () => 77), { number: 0, gmAngle: 0, direction: 'east' });
  assert.deepEqual(worksheetStart('?n=9&gm=11.5&dir=West', preset, () => 77), { number: 9, gmAngle: 11.5, direction: 'west' });
});

test('the angle and direction in an address are used together or not at all', () => {
  const classMap = { number: 1234, gmAngle: 8, direction: 'east' };
  // A usable half is never paired with the class map's other half.
  for (const search of [
    '?n=1234&gm=200&dir=west',
    '?n=1234&gm=8.25&dir=west',
    '?n=1234&gm=11.5&dir=sideways',
    '?n=1234&gm=11.5',
    '?n=1234&dir=west',
  ]) {
    assert.deepEqual(worksheetStart(search, preset, () => 77), classMap, search);
  }
  assert.deepEqual(worksheetStart('?n=1234&gm=11.5', noPreset, () => 77), { number: 1234, gmAngle: null, direction: 'east' });
});

test('a bare worksheet address uses a fresh number and the class map', () => {
  assert.deepEqual(worksheetStart('', preset, () => 4321), { number: 4321, gmAngle: 8, direction: 'east' });
  assert.deepEqual(worksheetStart('', noPreset, () => 4321), { number: 4321, gmAngle: null, direction: 'east' });
});

test('empty or invalid address values fall back instead of opening on an error', () => {
  const fallback = { number: 77, gmAngle: 8, direction: 'east' };
  for (const search of [
    '?n=&gm=',
    '?n=abc&gm=xyz&dir=up',
    '?n=1.5&gm=-5',
    '?n=4294967296&gm=200',
    '?n=0x10&gm=8.25',
    '?n=-3&gm=180',
  ]) {
    assert.deepEqual(worksheetStart(search, preset, () => 77), fallback, search);
  }
  assert.deepEqual(worksheetStart('?n=1.5', noPreset, () => 77), { number: 77, gmAngle: null, direction: 'east' });
});
