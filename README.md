# Rubric

A free, open-source, red-letter Bible reader with commentary from the
Reformers and Puritans — built to be forked and extended.

- **Red letters.** The words of Jesus are shown in red, using the
  translation's own word-level markup (not a hand-built list of verse
  ranges, so it's accurate down to the clause).
- **Commentary rail.** Click any verse and read what **John Gill**,
  **Matthew Henry**, **John Calvin**, **Jamieson‑Fausset‑Brown**,
  **Adam Clarke**, **Keil & Delitzsch**, or the **Tyndale Open Study
  Notes** wrote about it, tabbed side by side.
- **No backend, no build step, no API keys.** It's plain HTML/CSS/JS
  that calls a free public API directly from the browser. Host it
  anywhere that serves static files — GitHub Pages is free and is
  what this was built for.

## Live data, not a bundled copy

All Bible text and commentary is fetched at read-time from the
[Free Use Bible API](https://bible.helloao.org/docs/) (built by AO
Lab / HelloAOLab, MIT-licensed, no key, no rate limit, no usage
restrictions — see their [licensing note](https://bible.helloao.org/docs/guide/a-biblical-model-for-licensing-the-bible.html)).
That means:

- This repo ships **no copyrighted or bulky text** — it's just the
  reader.
- If AO Lab adds a translation or commentary, you get it for free
  without touching this code.
- You are dependent on that API being up. If you want independence
  from it, their `@helloao/cli` tool can generate your own static
  copy of the same data (JSON files) that you can self-host — see
  "Self-hosting the data" below.

### Sources used by default

| Type | id | Source | License |
|---|---|---|---|
| Bible text | `ENGWEBP` | World English Bible | Public domain |
| Bible text (alt) | `BSB` | Berean Standard Bible | Public domain |
| Commentary | `john-gill` | John Gill (1697–1771) | Public domain |
| Commentary | `matthew-henry` | Matthew Henry (1662–1714) | Public domain |
| Commentary | `john-calvin` | John Calvin (1509–1564), CCEL/Calvin Translation Society text | Public domain |
| Commentary | `jamieson-fausset-brown` | Jamieson, Fausset & Brown (1871) | Public domain |
| Commentary | `adam-clarke` | Adam Clarke (c.1762–1832) | Public domain |
| Commentary | `keil-delitzsch` | Keil & Delitzsch (19th c., Old Testament only) | Public domain |
| Commentary | `tyndale` | Tyndale Open Study Notes (modern) | **CC BY‑SA 4.0** — if you fork this and change the notes text, keep the attribution and the same license for that content |

Gill, Henry, and Calvin are the Puritan/Reformation core the brief
asked for; JFB, Clarke, Keil–Delitzsch, and Tyndale round it out with
the broader Protestant tradition. The tab order in the UI reflects
that priority — see `COMMENTARY_META` / `COMMENTARY_ORDER` in
`js/app.js` if you want to reorder, rename, or drop any of them.

## Running it locally

Because the JS is loaded as ES modules (`<script type="module">`),
opening `index.html` directly with `file://` won't work in most
browsers — serve it over HTTP:

```bash
cd rubric
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080`.

## Deploying to GitHub Pages (free)

1. Create a new GitHub repo and push this folder's contents to the
   `main` branch (this folder *is* the site root — `index.html`
   should be at the repo root, or in `/docs` if you prefer that
   layout and adjust the Pages setting to match).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to
   "Deploy from a branch," pick **`main`** and **`/root`** (or
   `/docs`), and save.
4. GitHub gives you a URL like `https://yourname.github.io/rubric/`
   within a minute or two.

No Actions workflow, no build artifacts, no secrets required — it's
static files calling a public API.

## How it's organized

```
index.html        page shell: topbar controls, reading column, commentary rail
css/style.css      all styling (see "Design notes" below)
js/api.js          the ONLY file that talks to the network
js/app.js          state, rendering, routing, everything else
```

- `js/api.js` is intentionally thin and isolated. If you want to
  point at a different host, add caching headers, or swap in a
  self-hosted mirror of the data, this is the one file to touch.
- `js/app.js` keeps a small `state` object and re-renders from it;
  there's no framework, so "reactivity" just means "call the render
  function after changing `state`."
- The chapter/book/translation currently open is reflected in the
  URL hash (`#MAT/5/ENGWEBP`) so links are shareable, and mirrored to
  `localStorage` so a reload picks up where you left off.

## Design notes

The palette and type are deliberately built around the *subject
matter* — aged paper, a rubricated (red-inked) manuscript accent, and
an illuminated drop cap on the first verse of each chapter — rather
than a generic app look. All tokens live at the top of
`css/style.css` if you want to reskin it:

```css
:root {
  --paper: #EAE3D0;   /* background */
  --ink: #2A2418;      /* body text */
  --red: #8C2018;      /* words of Jesus, rubric accents */
  --gold: #A9812E;     /* rules, illumination */
  --teal: #2F4C43;     /* links, active states */
  ...
}
```

## Ideas for further development

This was built as a solid, honest starting point — not a finished
product. Natural next steps, roughly easiest first:

- **More translations in the picker.** Only WEB and BSB are in the
  dropdown by default (both confirmed to carry the `wordsOfJesus`
  markup used for red-letter rendering). `api.getAvailableTranslations()`
  already exposes the full 1000+ translation catalog — build a
  searchable picker over it. Filter by `language === "eng"` for a
  quick English-only list, and sanity-check any new translation
  actually has red-letter data before defaulting to it.
- **Verse-range display for commentary.** Older commentaries often
  comment on a span of verses under the first verse's number (e.g.
  Matthew Henry commenting on Matt 5:3–12 as one note). The app
  currently detects and labels this ("Comment covers verses
  beginning at v.X") but doesn't know the *end* of the range, only
  the start — the API doesn't expose that directly, so you'd need to
  infer it from the gap to the next commented verse.
- **Cross-references.** The same API family exposes an
  `open-cross-ref` dataset (`/api/d/open-cross-ref/{book}/{chapter}.json`)
  — wire it into the commentary rail as another tab.
- **Strong's word study.** `.words.json` endpoints give per-word
  Strong's numbers for translations that support it — a nice
  "tap a word" popup for original-language study.
- **Audio.** Chapter responses already include
  `thisChapterAudioLinks` (multiple readers) — add a play button.
- **Search.** There's no full-text search yet; the jump box only
  parses `Book Chapter[:Verse]`. A real search would need either a
  client-side index or a third-party search API, since the Bible API
  itself doesn't expose search.
- **Reading modes.** A "red letters only" toggle (grey out
  everything else), a night mode, adjustable type size — all
  reasonable additions to `state` + a few CSS classes.
- **Self-hosting the data.** If you'd rather not depend on
  `bible.helloao.org` staying up, install `@helloao/cli`
  (`npm i -g @helloao/cli`), use its `source-translations` /
  `import-translation` / `upload-api-files` commands to generate a
  static copy of the same JSON API shape, upload it to your own S3
  bucket or a `data/` folder in this repo, and point `API_BASE` in
  `js/api.js` at it.
- **Tests.** There currently are none. The riskiest logic is the
  reference-jump parser and the "nearest earlier commented verse"
  fallback in `loadCommentary()` — both are pure functions and easy
  to unit test if you pull in a test runner.

## License

The app code in this repository (HTML/CSS/JS) is released under the
MIT License — see `LICENSE`. The Bible text and commentary it
displays are **not** part of this repo; they're fetched live and
carry their own licenses as listed in the table above (public domain,
except Tyndale Open Study Notes, which is CC BY‑SA 4.0).
