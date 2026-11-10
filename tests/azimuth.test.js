import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gridToMagnetic,
  magneticToGrid,
  backAzimuth,
  backAzimuthMils,
  degreesToMils,
  milsToDegrees,
} from '../js/azimuth.js';

// FM 3-25.26, chapter 6: with an easterly G-M angle, subtract going grid to
// magnetic and add going magnetic to grid. A westerly angle is the reverse.

test('easterly G-M angle: grid to magnetic subtracts', () => {
  const r = gridToMagnetic(100, 8, 'east');
  assert.equal(r.value, 92);
  assert.equal(r.operation, 'subtract');
  assert.equal(r.wrapped, false);
});

test('easterly G-M angle: magnetic to grid adds', () => {
  const r = magneticToGrid(92, 8, 'east');
  assert.equal(r.value, 100);
  assert.equal(r.operation, 'add');
});

test('westerly G-M angle: grid to magnetic adds', () => {
  const r = gridToMagnetic(100, 8, 'west');
  assert.equal(r.value, 108);
  assert.equal(r.operation, 'add');
});

test('westerly G-M angle: magnetic to grid subtracts', () => {
  const r = magneticToGrid(108, 8, 'west');
  assert.equal(r.value, 100);
  assert.equal(r.operation, 'subtract');
});

test('conversion wraps below 0 by adding 360', () => {
  const r = gridToMagnetic(5, 12, 'east');
  assert.equal(r.raw, -7);
  assert.equal(r.value, 353);
  assert.equal(r.wrapped, true);
});

test('conversion wraps past 360 by subtracting 360', () => {
  const r = gridToMagnetic(355, 12, 'west');
  assert.equal(r.raw, 367);
  assert.equal(r.value, 7);
  assert.equal(r.wrapped, true);
});

test('a result of exactly 360 is reported as 0', () => {
  assert.equal(magneticToGrid(350, 10, 'east').value, 0);
});

test('half-degree G-M angles do not produce floating point noise', () => {
  assert.equal(gridToMagnetic(100.1, 21.5, 'east').value, 78.6);
});

test('grid to magnetic then back returns the starting azimuth', () => {
  for (const dir of ['east', 'west']) {
    for (const az of [0, 3, 90, 179.5, 270, 358]) {
      const mag = gridToMagnetic(az, 11.5, dir).value;
      assert.equal(magneticToGrid(mag, 11.5, dir).value, az);
    }
  }
});

test('conversion rejects bad input', () => {
  assert.throws(() => gridToMagnetic(361, 8, 'east'), RangeError);
  assert.throws(() => gridToMagnetic(-1, 8, 'east'), RangeError);
  assert.throws(() => gridToMagnetic(NaN, 8, 'east'), RangeError);
  assert.throws(() => gridToMagnetic(100, -2, 'east'), RangeError);
  assert.throws(() => gridToMagnetic(100, 8, 'north'), RangeError);
});

test('back azimuth adds 180 below 180 and subtracts 180 at or above', () => {
  assert.deepEqual(backAzimuth(45), { value: 225, operation: 'add' });
  assert.deepEqual(backAzimuth(0), { value: 180, operation: 'add' });
  assert.deepEqual(backAzimuth(179), { value: 359, operation: 'add' });
  assert.deepEqual(backAzimuth(180), { value: 0, operation: 'subtract' });
  assert.deepEqual(backAzimuth(300), { value: 120, operation: 'subtract' });
  assert.deepEqual(backAzimuth(360), { value: 180, operation: 'subtract' });
});

test('back azimuth rejects values outside 0 to 360', () => {
  assert.throws(() => backAzimuth(400), RangeError);
  assert.throws(() => backAzimuth(-10), RangeError);
});

test('back azimuth in mils uses 3200', () => {
  assert.deepEqual(backAzimuthMils(800), { value: 4000, operation: 'add' });
  assert.deepEqual(backAzimuthMils(3200), { value: 0, operation: 'subtract' });
  assert.deepEqual(backAzimuthMils(5000), { value: 1800, operation: 'subtract' });
  assert.throws(() => backAzimuthMils(6500), RangeError);
});

test('6400 mils equal 360 degrees', () => {
  assert.equal(degreesToMils(360), 6400);
  assert.equal(degreesToMils(90), 1600);
  assert.equal(degreesToMils(1), 18); // 17.78 rounds to the nearest mil
  assert.equal(milsToDegrees(6400), 360);
  assert.equal(milsToDegrees(1600), 90);
  assert.equal(milsToDegrees(100), 5.6); // 5.625 to one decimal
});

// ---- Added after review ----

test('a result of exactly 360 shows the wrap step in the work', () => {
  const r = magneticToGrid(350, 10, 'east');
  assert.equal(r.raw, 360);
  assert.equal(r.wrapped, true);
});

test('G-M angle must be less than 180', () => {
  assert.throws(() => gridToMagnetic(100, 180, 'east'), RangeError);
  assert.equal(gridToMagnetic(100, 179.5, 'west').value, 279.5);
});

test('more than one decimal place is rejected, so the shown work is never rounded', () => {
  assert.throws(() => gridToMagnetic(22, 8.25, 'east'), RangeError);
  assert.throws(() => gridToMagnetic(22.25, 8, 'east'), RangeError);
  assert.throws(() => backAzimuth(179.96), RangeError);
  assert.throws(() => backAzimuthMils(3199.96), RangeError);
  assert.equal(gridToMagnetic(100.1, 8.3, 'east').value, 91.8);
});
