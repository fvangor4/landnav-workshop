// Pace count math. A pace count is the number of paces one person takes to
// cover 100 meters (FM 3-25.26, chapter 5). No DOM access.

function requireCount(count) {
  if (!Number.isFinite(count) || count <= 0) {
    throw new RangeError('Pace count must be greater than 0.');
  }
}

function requireNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be 0 or more.`);
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
  const exact = Math.round(countPer100 * meters) / 100; // to two decimals
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
