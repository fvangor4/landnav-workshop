---
status: approved
base: 97766fd
rigor:
  tests: tdd
  review: code
  review_at: end
  rereview: always
  execution: inline
  triggers_fired: []
---

# Land nav class reference site (GitHub Pages)

## Intent
- **Problem:** There is no free, phone-friendly reference a BLC (and sometimes
  ROTC) land navigation class can use in the room. The commercial option is a
  paid subscription.
- **Behavior change:** This repo serves a static site on GitHub Pages that
  students open on their phones during class, with a separate path for the
  instructor.
- **Sourcing rule:** Content comes from FM 3-25.26 (approved for public
  release) and is written fresh. Nothing is copied from 550 Cord (text,
  questions, graphics, name). TC 3-25.26 is not used unless its distribution
  statement is confirmed.
- **v1 scope:**
  - Quick-reference cards: terrain features (5 major, 3 minor, 2
    supplementary), map colors, marginal information, compass parts and
    holds, mils and degrees.
  - Calculators: declination (grid to magnetic and back, shows the work),
    back azimuth, pace count.
  - Grid coordinate drill on a generated grid square (4-, 6-, 8-digit).
  - Instructor path: a projector view (large type, high contrast) of the same
    cards and tools, and a printable worksheet with a separate answer key.
  - The declination tool starts with the class map's G-M angle filled in
    (still editable). The value lives in one config file.
  - Works offline after first load. Reference cards print cleanly.
  - Plain HTML/CSS/JS, no build step, no dependencies, no tracking.
  - A visible "unofficial, not endorsed by the Army or DoD" notice.
  - MIT license for the code.
- **Out of scope (v1):** Intersection/resection visualizer. Self-check quiz.
  Lesson flow page. Live problem generator with reveal. Real map imagery.
  Accounts, scores, or any backend. GPS or device compass.
- **Done when:**
  - `node --test` passes for the calculation, grid, and worksheet logic.
  - Every page is usable at 375 px wide with no horizontal scroll.
  - After one online load, the site loads with the network disabled.
  - Declination tool returns the FM 3-25.26 result for easterly and westerly
    G-M angles in both directions, including wraparound past 360 and below 0.
  - Back azimuth returns azimuth + 180 below 180, azimuth - 180 at or above.
  - Pace tool converts a personal 100 m count to paces for any distance.
  - Grid drill accepts the correct 4- and 6-digit grid exactly, accepts an
    8-digit grid within 1 in the last digit of easting and northing, and
    rejects anything further off.
  - The same worksheet seed always produces the same problems, and the answer
    key matches them.
  - Projector view can be switched on and off and persists across pages.
  - Print preview of the reference cards and the worksheet shows no
    navigation or controls; the answer key starts on its own page.

## Testing approach
Logic lives in small modules with no DOM access, written test-first and run
with Node's built-in runner (`node --test`, no dependencies). Page scripts
only wire inputs to those modules. Pages are checked in the browser at phone
width, in projector view, offline, and in print preview.

## Open Questions
- [x] What does the instructor path contain? → Projector view and printable
      worksheet with answer key.
- [x] Preload a map's G-M angle? → Yes, preload the class map.
- [x] License? → MIT.
- [ ] Which map sheet does the class use, and what is its G-M angle and
      direction (easterly or westerly)? Needed for the preset value.
- [ ] Pushing to GitHub and enabling Pages makes the site public. Needs the
      owner's go-ahead at ship time (task 11).

## Unknowns
- None. The repository is empty (no commits), so there is no existing code to
  investigate.

## Tasks
- [~] 1. Azimuth math: declination conversion both ways, back azimuth,
      mils and degrees
      files: js/azimuth.js, tests/azimuth.test.js, package.json
      commits: [9af8567]
- [~] 2. Pace count math: paces for a distance from a 100 m count, and
      distance from paces walked
      files: js/pace.js, tests/pace.test.js
      commits: [ba349c0]
- [~] 3. Grid logic: place a point in a grid square, derive its 4-, 6-,
      8-digit coordinate (read right then up, truncate), check an answer
      files: js/grid.js, tests/grid.test.js
      commits: [654c2d5]
- [~] 4. Seeded worksheet problem set: same seed gives the same problems
      and answers, built on the modules from tasks 1 to 3
      files: js/problems.js, tests/problems.test.js
      commits: [32f898d]
- [~] 5. Site shell and reference cards page, with the unofficial notice
      files: index.html, css/styles.css, js/site.js
      commits: [3ad91e8]
- [~] 6. Calculators page wired to tasks 1 and 2, with the map preset
      files: tools.html, js/tools-ui.js, js/config.js
      commits: [042a303]
- [~] 7. Grid drill page wired to task 3 (drawn grid square, answer check)
      files: drill.html, js/drill-ui.js, css/styles.css
      commits: [078b552]
- [~] 8. Instructor page and projector view toggle that persists across
      pages
      files: instructor.html, js/site.js, css/styles.css
      commits: [7a2c684]
- [~] 9. Printable worksheet with answer key wired to task 4, plus print
      styles for the reference cards
      files: worksheet.html, js/worksheet-ui.js, css/styles.css
      commits: [363a462]
- [~] 10. Offline support: service worker caching every page and asset,
      web manifest and icon
      files: sw.js, manifest.webmanifest, icon.svg (registration in
      js/site.js)
      commits: [4debf19]
- [~] 11. README, MIT LICENSE, .nojekyll; then, with the owner's go-ahead,
      push and enable GitHub Pages
      files: README.md, LICENSE, .nojekyll
      commits: [b8868d5]

## Log
- 2026-11-10: Audience confirmed as BLC mainly, sometimes ROTC. Students on
  phones; instructor gets a separate path.
- 2026-11-10: Pace tool will not apply fixed slope or night multipliers.
  FM 3-25.26 lists the factors that change a pace count but gives no numbers,
  so students enter their own measured counts per condition.
- 2026-11-10: Owner chose projector view + printable worksheet for the
  instructor path, a preloaded G-M angle, and the MIT license.
- 2026-11-10: Escalation checklist run, no categories hit. `tests: tdd`
  because this is new feature work.
- tasks 1-4: implemented test-first, 43 tests passing. Task 4's tests were
  written before the module but first run after it.
- task 5: added three cards beyond the planned five topics (contour lines,
  grid coordinates, norths and azimuths) because the tools and drill lean on
  them.
- task 6: also touched css/styles.css for form and result styles.
- task 7: added js/grid-svg.js (shared drawing code for the drill and the
  worksheet) and an enlarged 100 m view for 8-digit grids. This commit also
  carries a small wording fix to tools.html and js/tools-ui.js.
- task 8: added a "Send students here" address card. A QR code was considered
  and left out (needs an encoder; no dependencies allowed).
- task 9: verified print rules by switching the print media rules on in the
  browser. Real printed pagination was not checked (no headless browser on
  this machine).
- task 10: added tests/offline.test.js and linked the icon and manifest from
  all five pages. Offline verified by stopping the local server and loading
  every page.
- task 11: added .gitignore for .claude/ (local preview config). Push and
  Pages are not done; they wait on the owner. The class map G-M angle is
  still unset in js/config.js.
- review (code, whole change): 15 findings. All accepted except part of 15.
  Fixed in one round:
  1 class map value was saved on page load and then overrode a changed
    preset; now saved only on a student edit, never when it equals the
    preset, and cleared when the box is cleared (js/settings.js).
  2 worksheet pace problems could print rounded arithmetic; problems now
    always come out whole, and the Tools page says when it rounded.
  3 preset direction normalized in one place.
  4 drill score could be gamed by switching digits after a reveal; scoring
    moved to createScore in js/grid.js.
  5 inputs with more than one decimal place are rejected, so shown work is
    never a rounded equation.
  6 empty ?n= / ?gm= no longer read as 0; worksheet numbers capped at 999999.
  7-9 service worker rewritten: the whole site is refetched on each page
    open and the saved copy is replaced only if every file arrived. Install
    failure is now reported on the Instructor page and in the console.
  10-14 tests strengthened; tests/sw.test.js runs the worker against a fake
    network and cache.
  15 js/grid-svg.js now tested. Disagreement on the rest of 15: the page
    scripts stay without unit tests, as the approved testing approach says.
    The decisions that caused findings 1, 3, 4 and 6 were moved out of them
    into tested modules instead.
- known limit: a page that opens at the instant an update finishes could get
  old HTML with new scripts for that one load. Not handled.
- re-review of 003e058: 10 findings. Fixed in a second round:
  1-2 an update could still be half-saved if a download died after its
    headers, and a page could read the cache mid-write. Updates now go into
    a separate cache, are marked ready only after every body is read, and
    are switched to only when the next page is opened.
  3 a drill point is now scored once in total, not once per precision.
  4 an unreadable preset direction is refused and reported on the
    Instructor page, not coerced to east. 'West', 'W', 'westerly' are read.
  5 the one-decimal check no longer has a tolerance.
  6 pace math takes whole numbers only; the "rounded" decision for walked
    distance moved into js/pace.js.
  7 every page's footer now says whether the device has an offline copy.
  10 worksheet address values are validated as strictly as the math.
  8 (tests): added for no-cache, the single-update guard, body failure,
    mid-update reads, worker restart. Disagreement on the rest: the page
    scripts (site.js, tools-ui.js, drill-ui.js, worksheet-ui.js) still have
    no unit tests, per the approved testing approach. Their wiring was
    checked in the browser: no save on a fresh load, one score per point,
    address values restored, footer status shown.
  9 not applicable: the earlier code was never deployed, so no phone holds
    a preset saved by it.
- known limit, narrowed: two pages opened in different tabs within the same
  moment as an update switch could differ in version. A single page load
  cannot mix versions.
- re-review of e8cd5a8: no blocking findings, 4 minor, all fixed:
  1 saved copies are now named per site folder, so two copies of the site
    under one GitHub account do not serve or delete each other's files.
  2 a worksheet link's angle and direction are used as a pair or not at all.
  3 tests added for a save that fails partway and for a copy still being
    written; confirmed by mutation that they catch a marker written first,
    a missing cleanup, and deleting newer copies.
  4 the footer status line is asserted on every page.
