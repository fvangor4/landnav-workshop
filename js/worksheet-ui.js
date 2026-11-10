// Renders the printable worksheet and its answer key from problems.js.
// No problem generation or math lives here.

import { makeWorksheet } from './problems.js';
import { gridSquareSvg, zoomSquareSvg } from './grid-svg.js';
import { MAP_PRESET } from './config.js';

const $ = (id) => document.getElementById(id);

const SECTIONS = [
  { title: 'Azimuth conversion', types: ['grid-to-magnetic', 'magnetic-to-grid'] },
  { title: 'Back azimuth', types: ['back-azimuth'] },
  { title: 'Pace count', types: ['paces-for-distance', 'distance-from-paces'] },
  { title: 'Grid coordinates', types: ['grid-coordinate'] },
];

const direction = () => document.querySelector('input[name="ws-dir"]:checked').value;
const randomNumber = () => 1000 + Math.floor(Math.random() * 9000);

function problemHtml(p) {
  if (p.type !== 'grid-coordinate') {
    return `<li value="${p.number}"><span class="q">${p.question}</span><span class="blank"></span></li>`;
  }
  const figures =
    gridSquareSvg(p.given.point) + (p.given.digits === 8 ? zoomSquareSvg(p.given.point) : '');
  const zoomNote =
    p.given.digits === 8 ? ' The second square is the 100 m square around the point, enlarged.' : '';
  return (
    `<li value="${p.number}" class="grid-problem">` +
    `<span class="q">${p.question}${zoomNote}</span>` +
    `<div class="ws-figures">${figures}</div>` +
    '<span class="blank"></span></li>'
  );
}

function sheetHtml(sheet) {
  const heading =
    '<header class="sheet-head">' +
    `<h2>Land navigation practice <span class="sheet-no">Worksheet ${sheet.seed}</span></h2>` +
    '<p class="sheet-lines"><span>Name</span><span>Date</span></p>' +
    `<p>Use a G-M angle of <strong>${sheet.gmLabel}</strong> for the conversion problems. Show your work.</p>` +
    '</header>';

  const sections = SECTIONS.map(({ title, types }) => {
    const items = sheet.problems.filter((p) => types.includes(p.type)).map(problemHtml);
    return `<section class="sheet-section"><h3>${title}</h3><ol class="problems">${items.join('')}</ol></section>`;
  });

  const keyRows = sheet.problems
    .map(
      (p) =>
        `<tr><th scope="row">${p.number}</th><td class="num">${p.answer}</td><td>${p.work}</td></tr>`,
    )
    .join('');

  const notice =
    '<p class="sheet-foot">Unofficial training aid. Not endorsed by the U.S. Army or the Department of Defense. Written from FM 3-25.26.</p>';

  return (
    `<article class="sheet">${heading}${sections.join('')}${notice}</article>` +
    '<article class="sheet key">' +
    `<header class="sheet-head"><h2>Answer key <span class="sheet-no">Worksheet ${sheet.seed}</span></h2>` +
    `<p>G-M angle: <strong>${sheet.gmLabel}</strong></p></header>` +
    '<table class="table"><thead><tr><th scope="col">No.</th><th scope="col">Answer</th><th scope="col">Work</th></tr></thead>' +
    `<tbody>${keyRows}</tbody></table>${notice}</article>`
  );
}

function render() {
  const error = $('ws-error');
  const output = $('ws-output');
  const seed = $('ws-number').value.trim() === '' ? NaN : Number($('ws-number').value);
  const gm = $('ws-gm').value.trim() === '' ? null : Number($('ws-gm').value);

  const fail = (message) => {
    error.hidden = false;
    error.textContent = message;
    output.innerHTML = '';
  };

  if (gm === null) {
    fail("Enter the G-M angle from your map's declination diagram to build the worksheet.");
    return;
  }

  let sheet;
  try {
    sheet = makeWorksheet(seed, { gmAngle: gm, direction: direction() });
  } catch (problem) {
    if (!(problem instanceof RangeError)) throw problem;
    fail(problem.message);
    return;
  }

  error.hidden = true;
  output.innerHTML = sheetHtml(sheet);

  // Keep the address in step so the sheet can be bookmarked or reprinted.
  const params = new URLSearchParams({ n: seed, gm, dir: direction() });
  history.replaceState(null, '', `?${params}`);
}

// ---------- Start: address first, then the class map preset ----------

const query = new URLSearchParams(location.search);
const queryNumber = Number(query.get('n'));
$('ws-number').value = query.has('n') && Number.isInteger(queryNumber) && queryNumber >= 0 ? queryNumber : randomNumber();

const queryGm = Number(query.get('gm'));
if (query.has('gm') && Number.isFinite(queryGm)) {
  $('ws-gm').value = queryGm;
} else if (Number.isFinite(MAP_PRESET.gmAngle)) {
  $('ws-gm').value = MAP_PRESET.gmAngle;
}

const startDirection = query.get('dir') || MAP_PRESET.direction;
document.querySelector(`input[name="ws-dir"][value="${startDirection === 'west' ? 'west' : 'east'}"]`).checked = true;

document.querySelectorAll('#ws-number, #ws-gm, input[name="ws-dir"]').forEach((el) => el.addEventListener('input', render));
$('ws-new').addEventListener('click', () => {
  $('ws-number').value = randomNumber();
  render();
});

render();
