// Decisions about which G-M angle and worksheet number a page starts with.
// Kept apart from the pages so they can be tested. No DOM or storage access.

import { MAX_WORKSHEET_NUMBER } from './problems.js';

/**
 * Reads a direction typed by a person: 'east', 'West', 'westerly', 'E'.
 * Returns 'east', 'west', or null. A direction that cannot be read is never
 * guessed, because the wrong one turns every conversion the wrong way.
 */
export function parseDirection(value) {
  const word = String(value ?? '').trim().toLowerCase();
  if (word === 'east' || word === 'easterly' || word === 'e') return 'east';
  if (word === 'west' || word === 'westerly' || word === 'w') return 'west';
  return null;
}

/** A G-M angle the math will accept: 0 to under 180, one decimal at most. */
function validAngle(angle) {
  return (
    typeof angle === 'number' &&
    Number.isFinite(angle) &&
    angle >= 0 &&
    angle < 180 &&
    Number(angle.toFixed(1)) === angle
  );
}

/**
 * What is wrong with the class map preset in js/config.js, as a sentence for
 * the Instructor page, or null if it is usable or simply not set.
 */
export function presetProblem(preset) {
  if (!preset || preset.gmAngle === null || preset.gmAngle === undefined) return null;
  if (!validAngle(preset.gmAngle)) {
    return 'gmAngle must be a number from 0 to less than 180, with one decimal place at most.';
  }
  if (!parseDirection(preset.direction)) return "direction must be 'east' or 'west'.";
  return null;
}

/** The class map preset as { angle, direction }, or null when unset or unusable. */
export function presetGm(preset) {
  if (!preset || !validAngle(preset.gmAngle)) return null;
  const direction = parseDirection(preset.direction);
  return direction ? { angle: preset.gmAngle, direction } : null;
}

/**
 * The G-M angle the Tools page starts with: the student's own saved value if
 * there is one, otherwise the class map, otherwise blank.
 */
export function startingGm(saved, preset) {
  if (saved && Number.isFinite(saved.angle) && parseDirection(saved.direction)) {
    return { angle: saved.angle, direction: parseDirection(saved.direction) };
  }
  return presetGm(preset) || { angle: null, direction: 'east' };
}

/**
 * What to save after the student edits the G-M angle, or null to clear the
 * saved value. The class map value is never saved: a phone that only ever
 * showed the preset must pick up a new preset when the instructor changes it.
 */
export function gmToStore(angle, direction, preset) {
  if (angle === null) return null;
  const fromMap = presetGm(preset);
  if (fromMap && fromMap.angle === angle && fromMap.direction === direction) return null;
  return { angle, direction };
}

/**
 * Starting values for the worksheet page from its address (?n=&gm=&dir=).
 * Missing, empty, or unusable values fall back to a fresh number and the
 * class map, so a mistyped link still opens on a worksheet.
 */
export function worksheetStart(search, preset, randomNumber) {
  const query = new URLSearchParams(search);
  const given = (name) => (query.get(name) || '').trim();
  const fromMap = presetGm(preset);

  // Digits only: Number() would also accept '0x10', '1e3', and ''.
  const n = /^\d+$/.test(given('n')) ? Number(given('n')) : NaN;
  const validNumber = Number.isInteger(n) && n <= MAX_WORKSHEET_NUMBER;

  const gm = /^\d+(\.\d+)?$/.test(given('gm')) ? Number(given('gm')) : NaN;
  const dir = given('dir') === 'east' || given('dir') === 'west' ? given('dir') : null;

  return {
    number: validNumber ? n : randomNumber(),
    gmAngle: validAngle(gm) ? gm : fromMap ? fromMap.angle : null,
    direction: dir || (fromMap ? fromMap.direction : 'east'),
  };
}
