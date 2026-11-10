// Wires the Tools page to the math modules. No math lives here.

import {
  gridToMagnetic,
  magneticToGrid,
  backAzimuth,
  backAzimuthMils,
  degreesToMils,
  milsToDegrees,
} from './azimuth.js';
import { pacesForDistance, distanceFromPaces } from './pace.js';
import { MAP_PRESET } from './config.js';
import { presetGm, startingGm, gmToStore } from './settings.js';

const $ = (id) => document.getElementById(id);
const checked = (name) => document.querySelector(`input[name="${name}"]:checked`).value;
const MINUS = '−';

// localStorage can be unavailable (private windows, blocked site data).
const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  /** Saves a value, or removes the key when the value is null. */
  set(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* the page still works without saved values */
    }
  },
};

/** A number from an input, or null when the box is empty. */
function read(input) {
  return input.value.trim() === '' ? null : Number(input.value);
}

/** Fill a result block. Pass { error } to show a problem instead. */
function show(id, { value = '—', work = '', error = '' } = {}) {
  const box = $(id);
  box.classList.toggle('has-error', Boolean(error));
  box.classList.toggle('has-value', !error && value !== '—');
  box.querySelector('.result-value').textContent = error ? '—' : value;
  box.querySelector('.result-work').textContent = error || work;
}

/** Run a calculation, turning a RangeError from the math into a message. */
function attempt(id, calculate) {
  try {
    show(id, calculate());
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    show(id, { error: error.message });
  }
}

// ---------- G-M angle conversion ----------

const classMap = presetGm(MAP_PRESET);

function setDirection(direction) {
  document.querySelector(`input[name="dec-dir"][value="${direction}"]`).checked = true;
}

// `save` is true only when the student has just edited something. Saving on
// page load would store the class map value as if the student had typed it.
function updateDeclination({ save = false } = {}) {
  const mode = checked('dec-mode');
  const direction = checked('dec-dir');
  const gm = read($('dec-gm'));
  const azimuth = read($('dec-az'));
  const from = mode === 'g2m' ? 'Grid' : 'Magnetic';
  const to = mode === 'g2m' ? 'Magnetic' : 'Grid';

  $('dec-az-label').textContent = `${from} azimuth (degrees)`;
  $('dec-mode-hint').textContent =
    mode === 'g2m'
      ? 'You measured it on the map and need to set it on the compass.'
      : 'You shot it with the compass and need to plot it on the map.';
  $('dec-result').querySelector('.result-label').textContent = `${to} azimuth`;
  $('gm-mn').setAttribute('transform', `rotate(${direction === 'east' ? 20 : -20} 40 74)`);

  if (save) store.set('landnav.gm', gmToStore(gm, direction, MAP_PRESET));

  if (classMap) {
    const dirWord = classMap.direction === 'east' ? 'easterly' : 'westerly';
    const label = MAP_PRESET.name ? `${MAP_PRESET.name}: ` : 'Class map: ';
    $('dec-preset').hidden = false;
    $('dec-preset').textContent = `${label}G-M angle ${classMap.angle}° ${dirWord}.`;
  }

  if (gm === null) {
    show('dec-result', { work: "Enter the G-M angle from your map's declination diagram." });
    return;
  }
  if (azimuth === null) {
    show('dec-result');
    return;
  }

  attempt('dec-result', () => {
    const convert = mode === 'g2m' ? gridToMagnetic : magneticToGrid;
    const r = convert(azimuth, gm, direction);
    const sign = r.operation === 'add' ? '+' : MINUS;
    const rule = `${direction === 'east' ? 'Easterly' : 'Westerly'} G-M angle, ${from.toLowerCase()} to ${to.toLowerCase()}: ${r.operation}.`;
    const raw = String(r.raw).replace('-', MINUS);
    let work = `${azimuth}° ${sign} ${gm}° = ${raw}°`;
    if (r.wrapped) {
      work += r.raw < 0
        ? `, then ${raw}° + 360° = ${r.value}°`
        : `, then ${raw}° ${MINUS} 360° = ${r.value}°`;
    }
    return { value: `${r.value}°`, work: `${rule} ${work}` };
  });
}

// ---------- Back azimuth ----------

function updateBack() {
  const mils = checked('back-unit') === 'mil';
  const input = $('back-az');
  input.max = mils ? 6400 : 360;
  input.step = mils ? 1 : 0.5;
  input.placeholder = mils ? '0 to 6400' : '0 to 360';
  $('back-az-label').textContent = `Azimuth (${mils ? 'mils' : 'degrees'})`;

  const azimuth = read(input);
  if (azimuth === null) {
    show('back-result');
    return;
  }
  attempt('back-result', () => {
    const r = mils ? backAzimuthMils(azimuth) : backAzimuth(azimuth);
    const half = mils ? '3200' : '180°';
    const unit = mils ? ' mils' : '°';
    const sign = r.operation === 'add' ? '+' : MINUS;
    const why = r.operation === 'add' ? `Less than ${half}: add.` : `${half} or more: subtract.`;
    return {
      value: `${r.value}${unit}`,
      work: `${why} ${azimuth}${mils ? '' : '°'} ${sign} ${half} = ${r.value}${unit}`,
    };
  });
}

// ---------- Pace count ----------

const PACE_LABELS = {
  flat: 'My pace count on flat ground, day',
  hills: 'My pace count on hills',
  night: 'My pace count at night',
};

const paceCounts = Object.assign({ flat: null, hills: null, night: null }, store.get('landnav.pace'));

function updatePace({ conditionChanged = false } = {}) {
  const condition = checked('pace-cond');
  const countInput = $('pace-count');
  $('pace-count-label').textContent = PACE_LABELS[condition];

  if (conditionChanged) {
    countInput.value = paceCounts[condition] ?? '';
  } else {
    paceCounts[condition] = read(countInput);
    store.set('landnav.pace', paceCounts);
  }

  const count = read(countInput);
  const meters = read($('pace-meters'));
  const walked = read($('pace-walked'));
  const needCount = { work: 'Enter your pace count first.' };

  if (meters === null) show('pace-result');
  else if (count === null) show('pace-result', needCount);
  else {
    attempt('pace-result', () => {
      const r = pacesForDistance(count, meters);
      let work = r.rounded
        ? `${count} × ${meters} ÷ 100 = ${r.exact}, rounded to ${r.total}`
        : `${count} × ${meters} ÷ 100 = ${r.total}`;
      if (r.hundreds > 0 && r.remainderMeters > 0) {
        work += `. Count ${count} paces ${r.hundreds} time${r.hundreds === 1 ? '' : 's'}, then ${r.remainderPaces} more.`;
      } else if (r.hundreds > 1) {
        work += `. Count ${count} paces ${r.hundreds} times.`;
      }
      return { value: `${r.total} paces`, work };
    });
  }

  if (walked === null) show('walked-result');
  else if (count === null) show('walked-result', needCount);
  else {
    attempt('walked-result', () => {
      const covered = distanceFromPaces(count, walked);
      // Whole only when the paces divide evenly; otherwise say it is rounded.
      const whole = (walked * 100) % count === 0;
      const tail = whole ? `= ${covered}` : `≈ ${covered} (nearest meter)`;
      return { value: `${covered} m`, work: `${walked} ÷ ${count} × 100 ${tail}` };
    });
  }
}

// ---------- Mils and degrees ----------

function convertUnits(source) {
  const deg = $('conv-deg');
  const mil = $('conv-mil');
  if (source === deg) {
    const value = read(deg);
    mil.value = value === null || !Number.isFinite(value) || value < 0 ? '' : degreesToMils(value);
  } else {
    const value = read(mil);
    deg.value = value === null || !Number.isFinite(value) || value < 0 ? '' : milsToDegrees(value);
  }
}

// ---------- Start ----------

const gm = startingGm(store.get('landnav.gm'), MAP_PRESET);
if (gm.angle !== null) $('dec-gm').value = gm.angle;
setDirection(gm.direction);
$('pace-count').value = paceCounts.flat ?? '';

document.querySelectorAll('#declination input').forEach((el) =>
  el.addEventListener('input', () => updateDeclination({ save: true })),
);
document.querySelectorAll('#back input').forEach((el) => el.addEventListener('input', updateBack));
document.querySelectorAll('input[name="pace-cond"]').forEach((el) =>
  el.addEventListener('input', () => updatePace({ conditionChanged: true })),
);
['pace-count', 'pace-meters', 'pace-walked'].forEach((id) => $(id).addEventListener('input', () => updatePace()));
$('conv-deg').addEventListener('input', (event) => convertUnits(event.target));
$('conv-mil').addEventListener('input', (event) => convertUnits(event.target));

updateDeclination();
updateBack();
updatePace({ conditionChanged: true });
