// Grid coordinate logic for the drill. No DOM access.
//
// A point is { easting, northing, x, y }: the two-digit grid lines at the
// lower-left corner of its 1,000 m square, and its offset in meters to the
// right (x) and up (y) from that corner.

const two = (n) => String(n).padStart(2, '0');

/**
 * The grid coordinate of a point at 4, 6, or 8 digits.
 * Read right, then up. Digits are truncated, never rounded up.
 */
export function gridFor(point, digits) {
  if (digits !== 4 && digits !== 6 && digits !== 8) {
    throw new RangeError('Grid precision must be 4, 6, or 8 digits.');
  }
  const extra = (digits - 4) / 2; // digits added to each half
  const part = (line, offset) => {
    if (extra === 0) return two(line);
    const step = extra === 1 ? 100 : 10;
    return two(line) + String(Math.floor(offset / step)).padStart(extra, '0');
  };
  return part(point.easting, point.x) + part(point.northing, point.y);
}

/**
 * A random point for the drill. `rng` returns a number in [0, 1).
 * Offsets land 20 to 79 m past a 100 m line, so the 6-digit answer is never a
 * judgment call and the 8-digit tolerance never crosses a 100 m line.
 */
export function makePoint(rng = Math.random) {
  const pick = (count) => Math.floor(rng() * count);
  const offset = () => pick(10) * 100 + 20 + pick(60);
  return {
    easting: 10 + pick(80),
    northing: 10 + pick(80),
    x: offset(),
    y: offset(),
  };
}

/**
 * Check a typed answer against a point.
 * Returns { correct, expected, reason } where reason is one of:
 *   'correct'  - matches (8-digit: within 1 in the last digit of each half)
 *   'format'   - not the right number of digits
 *   'reversed' - northing given before easting (read up before right)
 *   'wrong'    - anything else
 */
export function checkAnswer(answer, point, digits) {
  const expected = gridFor(point, digits);
  const typed = String(answer).replace(/\s+/g, '');
  if (!/^\d+$/.test(typed) || typed.length !== digits) {
    return { correct: false, expected, reason: 'format' };
  }

  const half = digits / 2;
  const matches = (candidate) => {
    if (digits !== 8) return candidate === expected;
    const close = (a, b) => Math.abs(Number(a) - Number(b)) <= 1;
    return (
      close(candidate.slice(0, half), expected.slice(0, half)) &&
      close(candidate.slice(half), expected.slice(half))
    );
  };

  if (matches(typed)) return { correct: true, expected, reason: 'correct' };
  if (matches(typed.slice(half) + typed.slice(0, half))) {
    return { correct: false, expected, reason: 'reversed' };
  }
  return { correct: false, expected, reason: 'wrong' };
}

/**
 * Score keeper for the drill. A point can be read at 4, 6, or 8 digits; each
 * of those is scored once, on the first attempt. Once the answer has been
 * shown, nothing more is scored on that point.
 */
export function createScore() {
  let scored = new Set();
  let correct = 0;
  let attempts = 0;
  return {
    /** Returns true if this attempt counted toward the score. */
    record(digits, isCorrect) {
      if (scored.has(digits)) return false;
      scored.add(digits);
      attempts += 1;
      if (isCorrect) correct += 1;
      return true;
    },
    reveal() {
      scored = new Set([4, 6, 8]);
    },
    nextPoint() {
      scored = new Set();
    },
    get correct() {
      return correct;
    },
    get attempts() {
      return attempts;
    },
  };
}
