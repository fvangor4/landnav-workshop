import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDirection, presetGm, startingGm, gmToStore, worksheetStart } from '../js/settings.js';

const preset = { name: 'Test sheet', gmAngle: 8, direction: 'east' };
const noPreset = { name: '', gmAngle: null, direction: 'east' };

test('anything other than "west" is treated as easterly', () => {
  assert.equal(normalizeDirection('west'), 'west');
  assert.equal(normalizeDirection('east'), 'east');
  assert.equal(normalizeDirection('East'), 'east');
  assert.equal(normalizeDirection(undefined), 'east');
});

test('the class map preset is read once, with its direction normalized', () => {
  assert.deepEqual(presetGm(preset), { angle: 8, direction: 'east' });
  assert.deepEqual(presetGm({ gmAngle: 11, direction: 'West' }), { angle: 11, direction: 'east' });
  assert.equal(presetGm(noPreset), null);
  assert.equal(presetGm({ gmAngle: -4, direction: 'east' }), null);
});

test('with nothing saved, the tools start from the class map', () => {
  assert.deepEqual(startingGm(null, preset), { angle: 8, direction: 'east' });
  assert.deepEqual(startingGm(null, noPreset), { angle: null, direction: 'east' });
  assert.deepEqual(startingGm({ angle: 'x' }, preset), { angle: 8, direction: 'east' });
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
});

test('a bare worksheet address uses a fresh number and the class map', () => {
  assert.deepEqual(worksheetStart('', preset, () => 4321), { number: 4321, gmAngle: 8, direction: 'east' });
  assert.deepEqual(worksheetStart('', noPreset, () => 4321), { number: 4321, gmAngle: null, direction: 'east' });
});

test('empty or invalid address values are ignored, not read as zero', () => {
  assert.deepEqual(worksheetStart('?n=&gm=', preset, () => 77), { number: 77, gmAngle: 8, direction: 'east' });
  assert.deepEqual(worksheetStart('?n=abc&gm=xyz&dir=up', preset, () => 77), { number: 77, gmAngle: 8, direction: 'east' });
  assert.deepEqual(worksheetStart('?n=1.5', noPreset, () => 77), { number: 77, gmAngle: null, direction: 'east' });
  assert.deepEqual(worksheetStart('?n=4294967296', noPreset, () => 77), { number: 77, gmAngle: null, direction: 'east' });
  assert.deepEqual(worksheetStart('?n=0&gm=0', preset, () => 77), { number: 0, gmAngle: 0, direction: 'east' });
});
