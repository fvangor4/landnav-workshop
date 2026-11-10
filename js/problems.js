// Seeded practice problems for the printable worksheet. The same seed and
// G-M angle always give the same problems, so a reprint matches its answer
// key. No DOM access.

import { gridToMagnetic, magneticToGrid, backAzimuth } from './azimuth.js';
import { pacesForDistance, distanceFromPaces } from './pace.js';
import { gridFor, makePoint } from './grid.js';

/** Small repeatable random source (mulberry32). Returns numbers in [0, 1). */
export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split a grid string in half for reading: "114432" -> "114 432". */
export function spaced(grid) {
  return `${grid.slice(0, grid.length / 2)} ${grid.slice(grid.length / 2)}`;
}

/**
 * Build a worksheet.
 * Returns { seed, gmAngle, direction, problems } where each problem is
 * { number, type, given, question, answer, answerValue, work }.
 */
export function makeWorksheet(seed, { gmAngle, direction }) {
  if (!Number.isInteger(seed) || seed < 0) {
    throw new RangeError('Worksheet number must be a whole number, 0 or more.');
  }
  gridToMagnetic(0, gmAngle, direction); // validates the G-M angle and direction

  const rng = createRng(seed);
  const int = (min, max) => min + Math.floor(rng() * (max - min + 1));
  const gm = `${gmAngle}° ${direction === 'east' ? 'easterly' : 'westerly'}`;
  const problems = [];
  const add = (problem) => problems.push({ number: problems.length + 1, ...problem });

  // An azimuth that forces the conversion past north, when the G-M angle is
  // large enough for a whole-degree azimuth to do so.
  const wrappingAzimuth = (operation) => {
    if (gmAngle < 1) return int(0, 359);
    return operation === 'subtract'
      ? int(0, Math.ceil(gmAngle) - 1)
      : int(Math.ceil(360 - gmAngle), 359);
  };

  const conversion = (type, convert, from, to) => {
    const operation = convert(0, gmAngle, direction).operation;
    for (let i = 0; i < 3; i += 1) {
      const azimuth = i === 0 ? wrappingAzimuth(operation) : int(0, 359);
      const result = convert(azimuth, gmAngle, direction);
      const sign = result.operation === 'add' ? '+' : '−';
      const raw = String(result.raw).replace('-', '−');
      const wrapNote = result.wrapped
        ? ` = ${raw}°; ${raw}° ${result.raw < 0 ? '+' : '−'} 360°`
        : '';
      add({
        type,
        given: { azimuth },
        question: `Convert a ${from} azimuth of ${azimuth}° to a ${to} azimuth.`,
        answerValue: result.value,
        answer: `${result.value}°`,
        work: `${azimuth}° ${sign} ${gmAngle}°${wrapNote} = ${result.value}°`,
      });
    }
  };
  conversion('grid-to-magnetic', gridToMagnetic, 'grid', 'magnetic');
  conversion('magnetic-to-grid', magneticToGrid, 'magnetic', 'grid');

  for (let i = 0; i < 4; i += 1) {
    // Two below 180 (add) and two at or above (subtract).
    const azimuth = i < 2 ? int(0, 179) : int(180, 359);
    const result = backAzimuth(azimuth);
    add({
      type: 'back-azimuth',
      given: { azimuth },
      question: `What is the back azimuth of ${azimuth}°?`,
      answerValue: result.value,
      answer: `${result.value}°`,
      work: `${azimuth}° ${result.operation === 'add' ? '+' : '−'} 180° = ${result.value}°`,
    });
  }

  for (let i = 0; i < 3; i += 1) {
    const paceCount = int(58, 72);
    const meters = int(3, 19) * 50;
    const result = pacesForDistance(paceCount, meters);
    add({
      type: 'paces-for-distance',
      given: { paceCount, meters },
      question: `Your pace count is ${paceCount}. How many paces is ${meters} meters?`,
      answerValue: result.total,
      answer: `${result.total} paces`,
      work: `${paceCount} × ${meters} ÷ 100 = ${result.total}`,
    });
  }

  for (let i = 0; i < 2; i += 1) {
    const paceCount = int(58, 72);
    const paces = paceCount * int(2, 9);
    const meters = distanceFromPaces(paceCount, paces);
    add({
      type: 'distance-from-paces',
      given: { paceCount, paces },
      question: `Your pace count is ${paceCount}. You have walked ${paces} paces. How far have you gone?`,
      answerValue: meters,
      answer: `${meters} meters`,
      work: `${paces} ÷ ${paceCount} × 100 = ${meters}`,
    });
  }

  for (const digits of [6, 6, 8, 8]) {
    const point = makePoint(rng);
    const grid = gridFor(point, digits);
    add({
      type: 'grid-coordinate',
      given: { point, digits },
      question: `Give the ${digits}-digit grid coordinate of the point.`,
      answerValue: grid,
      answer: spaced(grid),
      work:
        digits === 8
          ? 'Read right, then up. Within 1 in the last digit of each half is acceptable.'
          : 'Read right, then up.',
    });
  }

  return { seed, gmAngle, direction, gmLabel: gm, problems };
}
