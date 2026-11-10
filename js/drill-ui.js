// Wires the grid drill page to grid.js. No coordinate math lives here.

import { gridFor, makePoint, checkAnswer, createScore } from './grid.js';
import { gridSquareSvg, zoomSquareSvg } from './grid-svg.js';

const $ = (id) => document.getElementById(id);
const spaced = (grid) => `${grid.slice(0, grid.length / 2)} ${grid.slice(grid.length / 2)}`;

const HINTS = {
  4: 'Names the 1,000 m square.',
  6: 'Locates the point to within 100 m.',
  8: 'Locates the point to within 10 m. One off in the last digit of each half still counts.',
};

let point = makePoint();
const score = createScore();

const digits = () => Number(document.querySelector('input[name="digits"]:checked').value);

function feedback(kind, text) {
  const box = $('feedback');
  box.hidden = false;
  box.className = `feedback ${kind}`;
  box.textContent = text;
}

function render() {
  const n = digits();
  $('square').innerHTML = gridSquareSvg(point);
  $('zoom').innerHTML = zoomSquareSvg(point);
  $('zoom-figure').hidden = n !== 8;
  $('digits-hint').textContent = HINTS[n];
  $('answer-label').textContent = `Your ${n}-digit grid`;
  $('answer').placeholder = `${n} digits`;
  $('answer').value = '';
  $('feedback').hidden = true;
  $('reveal').hidden = true;
}

function updateScore() {
  $('score').textContent =
    score.attempts === 0 ? '' : `Correct on the first try: ${score.correct} of ${score.attempts}`;
}

$('answer-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const n = digits();
  const result = checkAnswer($('answer').value, point, n);

  if (result.reason === 'format') {
    feedback('bad', `Enter ${n} digits, for example ${spaced(gridFor({ easting: 11, northing: 43, x: 478, y: 263 }, n))}.`);
    return;
  }

  // Only the first real attempt counts; createScore decides what that is.
  score.record(n, result.correct);
  updateScore();

  if (result.correct) {
    const typed = $('answer').value.replace(/\s+/g, '');
    const exact = typed === result.expected ? '' : ` The exact reading is ${spaced(result.expected)}.`;
    feedback('ok', `Correct: ${spaced(typed)}.${exact}`);
    $('reveal').hidden = true;
  } else if (result.reason === 'reversed') {
    feedback('bad', 'You read up before right. Read right first, then up.');
    $('reveal').hidden = false;
  } else {
    feedback('bad', 'Not quite. Start at the lower-left corner of the square, read right, then up.');
    $('reveal').hidden = false;
  }
});

$('reveal').addEventListener('click', () => {
  score.reveal();
  feedback('info', `Answer: ${spaced(gridFor(point, digits()))}`);
  $('reveal').hidden = true;
});

$('next').addEventListener('click', () => {
  point = makePoint();
  score.nextPoint();
  render();
  $('answer').focus();
});

document.querySelectorAll('input[name="digits"]').forEach((input) => input.addEventListener('input', render));

render();
updateScore();
