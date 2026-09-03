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

The translation picker is populated **live** from the API's catalog, not
hardcoded — `js/app.js` fetches `available_translations.json`, filters to
English, and auto-detects classic public-domain versions by matching on
their name (King James, American Standard, Young's Literal, Darby,
Douay-Rheims, Geneva, Webster, Weymouth, Bible in Basic English,
Wycliffe — whichever of these the API currently carries) into a
"Featured" group at the top, with every other English translation in
the API listed below that. This is deliberate: the API's 1000+
translations don't use predictable ids (bulk imports are keyed like
`abt_map`), so matching by name is the only approach that won't
silently break if we guessed an id wrong. The result is cached in
`localStorage` for a week so it doesn't re-download the whole catalog
on every visit.

| Type | id | Source | License |
|---|---|---|---|
| Bible text | `ENGWEBP` | World English Bible (default) | Public domain |
| Bible text (alt) | `BSB` | Berean Standard Bible | Public domain |
| Bible text (alt) | *auto-detected* | King James Version, American Standard Version, Young's Literal Translation, Darby, Douay-Rheims, Geneva Bible, Webster's Bible, Weymouth NT, Bible in Basic English, Wycliffe Bible, and dozens more | Public domain (verify per-translation `licenseUrl` if redistributing) |
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

- **Not every English version marks red letters.** Only translations
  that carry `wordsOfJesus` in their source data will render in red;
  others still work fine, they just show in plain black. WEB is
  confirmed to have this markup and stays the default for that reason.
  If you want to detect this ahead of time and label versions that
  don't support red-letter, fetch one chapter of known dialogue (e.g.
  John 3) and check whether any `wordsOfJesus: true` shows up.
- **A real search box for the translation picker**, instead of (or
  alongside) the current two-optgroup `<select>` — useful once you're
  regularly switching between many of the 1000+ non-English options.
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

## Newsletter signup

There's an optional email signup in the footer for telling people
about new features as you build them. Since this is a static site
with no backend, it posts straight to a third-party mailing-list
provider rather than to any server of your own.

It ships wired to **[Buttondown](https://buttondown.com)** (free tier,
built specifically for "send an update as a project develops," no
credit card required) as a working example. To activate it:

1. Create a free Buttondown account and note your username.
2. In `index.html`, replace both instances of `YOUR-USERNAME` in the
   newsletter `<form>` with it.
3. Deploy and test by subscribing yourself.

That's it — no JavaScript, no server, no build step.

**If you'd rather use a different provider**, swap the form's
`action` (and `onsubmit`, if the provider doesn't use one) for
theirs — the `<input name="email">` stays the same in every case:

- **Mailchimp** — create an embedded signup form in your Mailchimp
  audience settings; it gives you a full form snippet with its own
  action URL and a couple of Mailchimp-specific hidden fields to copy
  in alongside the email input.
- **ConvertKit / Kit** — same idea: create a landing page/form in
  their dashboard, copy the form action URL it gives you.
- **Formspree** — if you'd rather just get emailed each signup than
  run an actual mailing list, point the form at
  `https://formspree.io/f/{your-form-id}` after creating a free form
  there; no `target`/`onsubmit` popup needed, it can redirect normally.

The signup is intentionally a plain footer form, not a popup or a
gate on using the app — it doesn't block or interrupt reading.

## License

The app code in this repository (HTML/CSS/JS) is released under the
MIT License — see `LICENSE`. The Bible text and commentary it
displays are **not** part of this repo; they're fetched live and
carry their own licenses as listed in the table above (public domain,
except Tyndale Open Study Notes, which is CC BY‑SA 4.0).
