// Azimuth math from FM 3-25.26, chapter 6. No DOM access: this module is
// shared by the pages and the Node tests.

const round1 = (n) => Math.round(n * 10) / 10;

function requireAzimuth(value, max, unit) {
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new RangeError(`Azimuth must be between 0 and ${max} ${unit}.`);
  }
}

function convert(azimuth, gmAngle, operation) {
  requireAzimuth(azimuth, 360, 'degrees');
  if (!Number.isFinite(gmAngle) || gmAngle < 0 || gmAngle >= 180) {
    throw new RangeError('G-M angle must be 0 or more and less than 180 degrees.');
  }
  const raw = round1(operation === 'add' ? azimuth + gmAngle : azimuth - gmAngle);
  const value = round1(((raw % 360) + 360) % 360);
  return { value, raw, operation, wrapped: raw < 0 || raw >= 360 };
}

function requireDirection(direction) {
  if (direction !== 'east' && direction !== 'west') {
    throw new RangeError('G-M angle direction must be "east" or "west".');
  }
}

/**
 * Convert a grid azimuth to a magnetic azimuth.
 * Easterly G-M angle: subtract. Westerly G-M angle: add.
 * Returns { value, raw, operation, wrapped } so the page can show the work.
 */
export function gridToMagnetic(gridAzimuth, gmAngle, direction) {
  requireDirection(direction);
  return convert(gridAzimuth, gmAngle, direction === 'east' ? 'subtract' : 'add');
}

/**
 * Convert a magnetic azimuth to a grid azimuth.
 * Easterly G-M angle: add. Westerly G-M angle: subtract.
 */
export function magneticToGrid(magneticAzimuth, gmAngle, direction) {
  requireDirection(direction);
  return convert(magneticAzimuth, gmAngle, direction === 'east' ? 'add' : 'subtract');
}

function back(azimuth, half, unit) {
  requireAzimuth(azimuth, half * 2, unit);
  return azimuth < half
    ? { value: round1(azimuth + half), operation: 'add' }
    : { value: round1(azimuth - half), operation: 'subtract' };
}

/** Back azimuth in degrees: add 180 below 180, otherwise subtract 180. */
export function backAzimuth(azimuth) {
  return back(azimuth, 180, 'degrees');
}

/** Back azimuth in mils: add 3200 below 3200, otherwise subtract 3200. */
export function backAzimuthMils(azimuth) {
  return back(azimuth, 3200, 'mils');
}

/** 6400 mils = 360 degrees. Rounded to the nearest mil. */
export function degreesToMils(degrees) {
  return Math.round((degrees * 6400) / 360);
}

/** Rounded to one decimal place. */
export function milsToDegrees(mils) {
  return round1((mils * 360) / 6400);
}
