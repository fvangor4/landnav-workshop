---
status: approved
base:
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
- [ ] 1. Azimuth math: declination conversion both ways, back azimuth,
      mils and degrees
      files: js/azimuth.js, tests/azimuth.test.js, package.json
- [ ] 2. Pace count math: paces for a distance from a 100 m count, and
      distance from paces walked
      files: js/pace.js, tests/pace.test.js
- [ ] 3. Grid logic: place a point in a grid square, derive its 4-, 6-,
      8-digit coordinate (read right then up, truncate), check an answer
      files: js/grid.js, tests/grid.test.js
- [ ] 4. Seeded worksheet problem set: same seed gives the same problems
      and answers, built on the modules from tasks 1 to 3
      files: js/problems.js, tests/problems.test.js
- [ ] 5. Site shell and reference cards page, with the unofficial notice
      files: index.html, css/styles.css, js/site.js
- [ ] 6. Calculators page wired to tasks 1 and 2, with the map preset
      files: tools.html, js/tools-ui.js, js/config.js
- [ ] 7. Grid drill page wired to task 3 (drawn grid square, answer check)
      files: drill.html, js/drill-ui.js, css/styles.css
- [ ] 8. Instructor page and projector view toggle that persists across
      pages
      files: instructor.html, js/site.js, css/styles.css
- [ ] 9. Printable worksheet with answer key wired to task 4, plus print
      styles for the reference cards
      files: worksheet.html, js/worksheet-ui.js, css/styles.css
- [ ] 10. Offline support: service worker caching every page and asset,
      web manifest and icon
      files: sw.js, manifest.webmanifest, icon.svg (registration in
      js/site.js)
- [ ] 11. README, MIT LICENSE, .nojekyll; then, with the owner's go-ahead,
      push and enable GitHub Pages
      files: README.md, LICENSE, .nojekyll

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
