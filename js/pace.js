// Pace count math. A pace count is the number of paces one person takes to
// cover 100 meters (FM 3-25.26, chapter 5). No DOM access.

// Everything here is a whole number: paces are counted, and distances are
// given in whole meters. That keeps count x meters / 100 exact to two
// decimals, so the figure shown before rounding is never itself rounded.

function requireCount(count) {
  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError('Pace count must be greater than 0.');
  }
  if (!Number.isInteger(count)) {
    throw new RangeError('Pace count must be a whole number.');
  }
}

function requireNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be 0 or more.`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be a whole number.`);
  }
}

/**
 * Paces needed to cover a distance, given a personal 100 m pace count.
 * Also breaks the distance into full 100 m legs plus the leftover, which is
 * how a pace count is kept in practice. `exact` is the figure before rounding
 * to a whole pace, and `rounded` says whether rounding changed it.
 */
export function pacesForDistance(countPer100, meters) {
  requireCount(countPer100);
  requireNonNegative(meters, 'Distance');
  const hundreds = Math.floor(meters / 100);
  const remainderMeters = meters - hundreds * 100;
  const exact = (countPer100 * meters) / 100;
  const total = Math.round(exact);
  return {
    total,
    exact,
    rounded: total !== exact,
    hundreds,
    remainderMeters,
    remainderPaces: Math.round((countPer100 * remainderMeters) / 100),
  };
}

/** Meters covered after a number of paces, to the nearest meter. */
export function distanceFromPaces(countPer100, paces) {
  requireCount(countPer100);
  requireNonNegative(paces, 'Paces');
  return Math.round((paces / countPer100) * 100);
}

/**
 * True when the paces come to a whole number of meters, so the distance from
 * distanceFromPaces was not rounded.
 */
export function pacesDivideEvenly(countPer100, paces) {
  requireCount(countPer100);
  requireNonNegative(paces, 'Paces');
  return (paces * 100) % countPer100 === 0;
}
