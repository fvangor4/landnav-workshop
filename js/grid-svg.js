// Draws a grid square with a plotted point as an SVG string. Shared by the
// grid drill and the printable worksheet. Drawing only: the coordinate math
// lives in grid.js.

const two = (n) => String(((n % 100) + 100) % 100).padStart(2, '0');

const LEFT = 34; // room for the northing labels
const TOP = 10;
const SIZE = 200; // drawn size of the square
const BOTTOM = TOP + SIZE;
const RIGHT = LEFT + SIZE;

/**
 * One square with ten divisions each way.
 * labels: { left, right, bottom, top } text for the four bounding lines.
 * px, py: the point's position as a fraction (0 to 1) across and up.
 */
function square({ labels, px, py, title }) {
  const parts = [];
  const step = SIZE / 10;

  for (let i = 1; i < 10; i += 1) {
    const cls = i === 5 ? 'gs-mid' : 'gs-fine';
    const x = LEFT + i * step;
    const y = BOTTOM - i * step;
    parts.push(`<line class="${cls}" x1="${x}" y1="${TOP}" x2="${x}" y2="${BOTTOM}"/>`);
    parts.push(`<line class="${cls}" x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}"/>`);
    parts.push(`<text class="gs-tick" x="${x}" y="${BOTTOM + 9}" text-anchor="middle">${i}</text>`);
    parts.push(`<text class="gs-tick" x="${LEFT - 4}" y="${y + 2.5}" text-anchor="end">${i}</text>`);
  }

  // The four bounding grid lines, run a little past the corners.
  const over = 6;
  parts.push(`<line class="gs-line" x1="${LEFT}" y1="${TOP - over}" x2="${LEFT}" y2="${BOTTOM + over}"/>`);
  parts.push(`<line class="gs-line" x1="${RIGHT}" y1="${TOP - over}" x2="${RIGHT}" y2="${BOTTOM + over}"/>`);
  parts.push(`<line class="gs-line" x1="${LEFT - over}" y1="${BOTTOM}" x2="${RIGHT + over}" y2="${BOTTOM}"/>`);
  parts.push(`<line class="gs-line" x1="${LEFT - over}" y1="${TOP}" x2="${RIGHT + over}" y2="${TOP}"/>`);

  parts.push(`<text class="gs-label" x="${LEFT}" y="${BOTTOM + 22}" text-anchor="middle">${labels.left}</text>`);
  parts.push(`<text class="gs-label" x="${RIGHT}" y="${BOTTOM + 22}" text-anchor="middle">${labels.right}</text>`);
  parts.push(`<text class="gs-label" x="${LEFT - 9}" y="${BOTTOM + 4}" text-anchor="end">${labels.bottom}</text>`);
  parts.push(`<text class="gs-label" x="${LEFT - 9}" y="${TOP + 4}" text-anchor="end">${labels.top}</text>`);

  const cx = (LEFT + px * SIZE).toFixed(1);
  const cy = (BOTTOM - py * SIZE).toFixed(1);
  parts.push(`<path class="gs-cross" d="M${cx - 7} ${cy}H${+cx + 7}M${cx} ${cy - 7}V${+cy + 7}"/>`);
  parts.push(`<circle class="gs-point" cx="${cx}" cy="${cy}" r="2.6"/>`);

  return (
    `<svg class="grid-square" viewBox="0 0 ${RIGHT + 12} ${BOTTOM + 28}" role="img" aria-label="${title}">` +
    parts.join('') +
    '</svg>'
  );
}

/** The full 1,000 m grid square. Each division is 100 m. */
export function gridSquareSvg(point) {
  return square({
    labels: {
      left: two(point.easting),
      right: two(point.easting + 1),
      bottom: two(point.northing),
      top: two(point.northing + 1),
    },
    px: point.x / 1000,
    py: point.y / 1000,
    title: `Grid square ${two(point.easting)} ${two(point.northing)} with a plotted point`,
  });
}

/** The 100 m square around the point. Each division is 10 m. */
export function zoomSquareSvg(point) {
  const hx = Math.floor(point.x / 100);
  const hy = Math.floor(point.y / 100);
  const next = (line, hundred) =>
    hundred === 9 ? `${two(line + 1)}0` : `${two(line)}${hundred + 1}`;
  return square({
    labels: {
      left: `${two(point.easting)}${hx}`,
      right: next(point.easting, hx),
      bottom: `${two(point.northing)}${hy}`,
      top: next(point.northing, hy),
    },
    px: (point.x % 100) / 100,
    py: (point.y % 100) / 100,
    title: 'Enlarged view of the 100 meter square around the point',
  });
}
