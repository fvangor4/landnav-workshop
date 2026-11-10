# Land Nav Workshop

A free, phone-friendly reference for a land navigation class. Built for Army
BLC and ROTC classrooms: students open it on their phones, and the instructor
can put the same pages on the classroom screen.

**Unofficial training aid.** Not endorsed by the U.S. Army or the Department
of Defense. Follow your instructor and current doctrine.

## What is in it

| Page | What it does |
|---|---|
| Reference (`index.html`) | Cards for terrain features, contour lines, map colors, marginal information, grid coordinates, norths and azimuths, the lensatic compass, and mils. Prints as a handout. |
| Tools (`tools.html`) | G-M angle conversion, back azimuth, pace count, and mils to degrees. Each one shows the work. |
| Grid drill (`drill.html`) | Read 4-, 6-, and 8-digit grids off a generated grid square, with answer checking. |
| Instructor (`instructor.html`) | Projector view for the classroom screen, and a link to the worksheet. |
| Worksheet (`worksheet.html`) | A printable set of 19 practice problems with an answer key on its own page. The same worksheet number always prints the same problems. |

The site works without a signal after the first visit. Nothing is tracked and
nothing leaves the phone; pace counts and the G-M angle are saved in the
browser only.

## Set your class map

Edit `js/config.js` so the Tools page and the worksheet start with your map's
G-M angle:

```js
export const MAP_PRESET = {
  name: 'Your map sheet 1:50,000',
  gmAngle: 8,          // degrees, from the declination diagram
  direction: 'east',   // 'east' or 'west'
};
```

Leave `gmAngle` as `null` to make students type it from their own map. If the
setting cannot be read (for example a direction other than east or west), it
is not used, and the Instructor page says what to fix.

## Run it locally

There is no build step and there are no dependencies. Serve the folder with
any static file server:

```bash
python3 -m http.server 8123
```

Then open `http://localhost:8123`.

## Tests

The math (azimuths, pace count, grid coordinates, worksheet problems) lives in
small modules under `js/` and is tested with Node's built-in test runner:

```bash
node --test
```

## Publish on GitHub Pages

1. Push the repository to GitHub.
2. In the repository, open Settings, then Pages.
3. Under Build and deployment, choose Deploy from a branch, then the `main`
   branch and the `/ (root)` folder.

The site appears at `https://<your-user>.github.io/<repository>/`.

## Changing the site

- When you add a page, script, or stylesheet, add it to the `ASSETS` list in
  `sw.js` so it is available offline. A test fails if you forget.
- Published changes reach a returning visitor on the second page they open
  afterward. The first page opened is answered from the saved copy while the
  whole updated site downloads in the background; the next page opened uses
  it. An update is all or nothing, so a dropped signal never leaves a phone
  with half of one.
- The line at the bottom of every page says whether that device has saved its
  offline copy.

## Sources

The content is written from FM 3-25.26, *Map Reading and Land Navigation*,
which is approved for public release with unlimited distribution. Two memory
aids on the site (LARS and the terrain-feature phrase) are common classroom
aids and are labeled as not coming from the manual.

## License

The code is released under the MIT License. See `LICENSE`.
