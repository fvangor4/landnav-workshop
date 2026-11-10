// Decisions about which G-M angle and worksheet number a page starts with.
// Kept apart from the pages so they can be tested. No DOM or storage access.

import { MAX_WORKSHEET_NUMBER } from './problems.js';

/** Anything other than 'west' is treated as easterly. */
export function normalizeDirection(direction) {
  return direction === 'west' ? 'west' : 'east';
}

/** The class map preset as { angle, direction }, or null when none is set. */
export function presetGm(preset) {
  if (!preset || !Number.isFinite(preset.gmAngle) || preset.gmAngle < 0) return null;
  return { angle: preset.gmAngle, direction: normalizeDirection(preset.direction) };
}

/**
 * The G-M angle the Tools page starts with: the student's own saved value if
 * there is one, otherwise the class map, otherwise blank.
 */
export function startingGm(saved, preset) {
  if (saved && Number.isFinite(saved.angle)) {
    return { angle: saved.angle, direction: normalizeDirection(saved.direction) };
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
 * Missing, empty, or invalid values fall back to a fresh number and the
 * class map rather than being read as zero.
 */
export function worksheetStart(search, preset, randomNumber) {
  const query = new URLSearchParams(search);
  const given = (name) => (query.get(name) || '').trim();
  const fromMap = presetGm(preset);

  const n = Number(given('n'));
  const validNumber = given('n') !== '' && Number.isInteger(n) && n >= 0 && n <= MAX_WORKSHEET_NUMBER;

  const gm = Number(given('gm'));
  const validGm = given('gm') !== '' && Number.isFinite(gm);

  const dir = given('dir');
  const validDir = dir === 'east' || dir === 'west';

  return {
    number: validNumber ? n : randomNumber(),
    gmAngle: validGm ? gm : fromMap ? fromMap.angle : null,
    direction: validDir ? dir : fromMap ? fromMap.direction : 'east',
  };
}
