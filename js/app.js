// app.js
// Rubric — a red-letter Bible reader with Reformation & Puritan commentary.
// Vanilla JS, no build step, no framework. See README.md for the data
// sources and for ideas on where to take this next.

import * as api from "./api.js";

/* ----------------------------------------------------------------
 * Commentary metadata
 * The API gives us id/name/license but not era or tradition, so we
 * annotate that ourselves. Order here is also tab order: the Puritan
 * and Reformation-era writers the user asked for come first.
 * ---------------------------------------------------------------- */
const COMMENTARY_META = {
  "john-gill": {
    label: "Gill",
    author: "John Gill",
    era: "1697–1771 · Particular Baptist",
  },
  "matthew-henry": {
    label: "Henry",
    author: "Matthew Henry",
    era: "1662–1714 · Nonconformist",
  },
  "john-calvin": {
    label: "Calvin",
    author: "John Calvin",
    era: "1509–1564 · Reformer",
  },
  "jamieson-fausset-brown": {
    label: "JFB",
    author: "Jamieson, Fausset & Brown",
    era: "1871 · Reformed",
  },
  "adam-clarke": {
    label: "Clarke",
    author: "Adam Clarke",
    era: "c.1762–1832 · Methodist",
  },
  "keil-delitzsch": {
    label: "Keil–Delitzsch",
    author: "Keil & Delitzsch",
    era: "19th c. · Lutheran (OT only)",
  },
  "tyndale": {
    label: "Tyndale Notes",
    author: "Tyndale House",
    era: "Modern evangelical study notes",
  },
};
const COMMENTARY_ORDER = Object.keys(COMMENTARY_META);

/* ---------------------------------------------------------------- */

const els = {
  bookSelect: document.getElementById("book-select"),
  chapterSelect: document.getElementById("chapter-select"),
  translationSelect: document.getElementById("translation-select"),
  chapterTitle: document.getElementById("chapter-title"),
  chapterSub: document.getElementById("chapter-sub"),
  verses: document.getElementById("verses"),
  prevBtn: document.getElementById("prev-chapter"),
  nextBtn: document.getElementById("next-chapter"),
  rail: document.getElementById("commentary-rail"),
  commentaryRef: document.getElementById("commentary-ref"),
  commentaryTabs: document.getElementById("commentary-tabs"),
  commentaryBody: document.getElementById("commentary-body"),
  sheetClose: document.getElementById("sheet-close"),
  scrim: document.getElementById("scrim"),
  jumpForm: document.getElementById("jump-form"),
  jumpInput: document.getElementById("jump-input"),
  brandHome: document.getElementById("brand-home"),
};

const STORAGE_KEY = "rubric:lastPosition";

const state = {
  translationId: "ENGWEBP",
  bookId: "MAT",
  chapter: 5,
  books: [],
  booksById: new Map(),
  selectedVerse: null,
  commentaryId: "john-gill",
  chapterFootnotes: new Map(),
};

/* ----------------------------------------------------------------
 * Boot
 * ---------------------------------------------------------------- */

init().catch((err) => {
  console.error(err);
  els.verses.innerHTML = `<p class="error">Something went wrong loading the Bible API. Check your connection and reload. (${escapeHtml(err.message)})</p>`;
});

async function init() {
  restorePosition();

  populateTranslationSelect();
  await loadBooksForTranslation(state.translationId);

  window.addEventListener("hashchange", onHashChange);
  parseHash(); // hash, if present, overrides restored/default position

  els.bookSelect.addEventListener("change", onBookChange);
  els.chapterSelect.addEventListener("change", onChapterChange);
  els.translationSelect.addEventListener("change", onTranslationChange);
  els.prevBtn.addEventListener("click", () => stepChapter(-1));
  els.nextBtn.addEventListener("click", () => stepChapter(1));
  els.sheetClose.addEventListener("click", closeMobileSheet);
  els.scrim.addEventListener("click", closeMobileSheet);
  els.jumpForm.addEventListener("submit", onJumpSubmit);
  els.brandHome.addEventListener("click", (e) => {
    e.preventDefault();
    goTo("MAT", 5);
  });

  await renderChapter();
}

/* ----------------------------------------------------------------
 * Translation + book selectors
 * ---------------------------------------------------------------- */

function populateTranslationSelect() {
  // A short curated list loads instantly; the full 1000+ translation
  // catalog is available at api.getAvailableTranslations() if you want
  // to build a richer picker (see README "Ideas for further work").
  const curated = [
    { id: "ENGWEBP", label: "World English Bible (WEB)" },
    { id: "BSB", label: "Berean Standard Bible (BSB)" },
  ];
  els.translationSelect.innerHTML = curated
    .map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`)
    .join("");
  els.translationSelect.value = state.translationId;
}

async function loadBooksForTranslation(translationId) {
  const data = await api.getBooks(translationId);
  state.books = data.books;
  state.booksById = new Map(data.books.map((b) => [b.id, b]));

  const isStandard66 = data.books.length === 66;
  if (isStandard66) {
    const ot = data.books.filter((b) => b.order <= 39);
    const nt = data.books.filter((b) => b.order > 39);
    els.bookSelect.innerHTML =
      groupOptions("Old Testament", ot) + groupOptions("New Testament", nt);
  } else {
    els.bookSelect.innerHTML = data.books
      .map((b) => `<option value="${b.id}">${escapeHtml(b.commonName)}</option>`)
      .join("");
  }
  els.bookSelect.value = state.booksById.has(state.bookId) ? state.bookId : data.books[0].id;
  state.bookId = els.bookSelect.value;
  populateChapterSelect();
}

function groupOptions(label, books) {
  const opts = books
    .map((b) => `<option value="${b.id}">${escapeHtml(b.commonName)}</option>`)
    .join("");
  return `<optgroup label="${label}">${opts}</optgroup>`;
}

function populateChapterSelect() {
  const book = state.booksById.get(state.bookId);
  const count = book ? book.numberOfChapters : 1;
  let opts = "";
  for (let i = 1; i <= count; i++) opts += `<option value="${i}">${i}</option>`;
  els.chapterSelect.innerHTML = opts;
  if (state.chapter > count) state.chapter = 1;
  els.chapterSelect.value = state.chapter;
}

/* ----------------------------------------------------------------
 * Navigation events
 * ---------------------------------------------------------------- */

function onBookChange() {
  state.bookId = els.bookSelect.value;
  state.chapter = 1;
  populateChapterSelect();
  afterNavigate();
}

function onChapterChange() {
  state.chapter = parseInt(els.chapterSelect.value, 10);
  afterNavigate();
}

async function onTranslationChange() {
  state.translationId = els.translationSelect.value;
  await loadBooksForTranslation(state.translationId);
  afterNavigate();
}

function stepChapter(delta) {
  const book = state.booksById.get(state.bookId);
  let chapter = state.chapter + delta;
  let bookIndex = state.books.findIndex((b) => b.id === state.bookId);

  if (chapter < 1) {
    bookIndex -= 1;
    if (bookIndex < 0) return; // already at the very start
    state.bookId = state.books[bookIndex].id;
    chapter = state.booksById.get(state.bookId).numberOfChapters;
  } else if (chapter > book.numberOfChapters) {
    bookIndex += 1;
    if (bookIndex >= state.books.length) return; // already at the very end
    state.bookId = state.books[bookIndex].id;
    chapter = 1;
  }

  state.chapter = chapter;
  els.bookSelect.value = state.bookId;
  populateChapterSelect();
  afterNavigate();
}

function afterNavigate() {
  state.selectedVerse = null;
  savePosition();
  updateHash();
  renderChapter();
}

function goTo(bookId, chapter, verse) {
  if (!state.booksById.has(bookId)) return;
  state.bookId = bookId;
  els.bookSelect.value = bookId;
  populateChapterSelect();
  state.chapter = Math.min(chapter, state.booksById.get(bookId).numberOfChapters);
  els.chapterSelect.value = state.chapter;
  state.selectedVerse = null;
  savePosition();
  updateHash();
  renderChapter().then(() => {
    if (verse) selectVerse(verse);
  });
}

/* ----------------------------------------------------------------
 * Reference jump box ("John 3:16", "Matthew 5")
 * ---------------------------------------------------------------- */

function onJumpSubmit(e) {
  e.preventDefault();
  const raw = els.jumpInput.value.trim();
  if (!raw) return;
  const match = raw.match(/^(.+?)\s+(\d+)\s*(?::\s*(\d+))?$/);
  if (!match) {
    flashJumpError();
    return;
  }
  const [, namePart, chapterStr, verseStr] = match;
  const book = findBookByName(namePart.trim());
  if (!book) {
    flashJumpError();
    return;
  }
  els.jumpInput.value = "";
  goTo(book.id, parseInt(chapterStr, 10), verseStr ? parseInt(verseStr, 10) : null);
}

function findBookByName(name) {
  const needle = name.toLowerCase();
  let found = state.books.find((b) => b.commonName.toLowerCase() === needle);
  if (found) return found;
  found = state.books.find((b) => b.commonName.toLowerCase().startsWith(needle));
  if (found) return found;
  return state.books.find((b) => b.commonName.toLowerCase().includes(needle));
}

function flashJumpError() {
  els.jumpInput.style.borderColor = "var(--red)";
  els.jumpInput.placeholder = "Try: John 3:16";
  setTimeout(() => {
    els.jumpInput.style.borderColor = "";
  }, 1200);
}

/* ----------------------------------------------------------------
 * Hash routing (shareable permalinks: #MAT/5/ENGWEBP)
 * ---------------------------------------------------------------- */

function updateHash() {
  const hash = `#${state.bookId}/${state.chapter}/${state.translationId}`;
  history.replaceState(null, "", hash);
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return;
  const [bookId, chapterStr, translationId] = raw.split("/");
  if (bookId && state.booksById.has(bookId)) state.bookId = bookId;
  if (chapterStr) state.chapter = parseInt(chapterStr, 10) || 1;
  if (translationId) state.translationId = translationId;
  els.bookSelect.value = state.bookId;
  populateChapterSelect();
  els.chapterSelect.value = state.chapter;
  els.translationSelect.value = state.translationId;
}

function onHashChange() {
  parseHash();
  renderChapter();
}

/* ----------------------------------------------------------------
 * Position persistence
 * ---------------------------------------------------------------- */

function savePosition() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bookId: state.bookId,
        chapter: state.chapter,
        translationId: state.translationId,
        commentaryId: state.commentaryId,
      })
    );
  } catch (_) {
    /* localStorage unavailable — no big deal, just skip persistence */
  }
}

function restorePosition() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved.bookId) state.bookId = saved.bookId;
    if (saved.chapter) state.chapter = saved.chapter;
    if (saved.translationId) state.translationId = saved.translationId;
    if (saved.commentaryId) state.commentaryId = saved.commentaryId;
  } catch (_) {
    /* ignore malformed storage */
  }
}

/* ----------------------------------------------------------------
 * Rendering the chapter of scripture
 * ---------------------------------------------------------------- */

async function renderChapter() {
  els.verses.innerHTML = `<p class="loading">Fetching the text…</p>`;
  els.chapterTitle.textContent = "Loading…";
  updateHash();

  let data;
  try {
    data = await api.getChapter(state.translationId, state.bookId, state.chapter);
  } catch (err) {
    els.verses.innerHTML = `<p class="error">Couldn't load this chapter (${escapeHtml(err.message)}). Try another chapter or translation.</p>`;
    return;
  }

  const book = state.booksById.get(state.bookId);
  els.chapterTitle.textContent = `${book.commonName} ${state.chapter}`;
  els.chapterSub.textContent = `${data.translation.englishName} (${data.translation.shortName})`;

  state.chapterFootnotes = new Map(
    (data.chapter.footnotes || []).map((f) => [f.noteId, f])
  );

  els.verses.innerHTML = "";
  const frag = document.createDocumentFragment();

  for (const item of data.chapter.content) {
    if (item.type === "heading") {
      const h = document.createElement("div");
      h.className = "section-heading";
      h.textContent = item.content.join(" ");
      frag.appendChild(h);
    } else if (item.type === "hebrew_subtitle") {
      const h = document.createElement("div");
      h.className = "section-heading";
      h.style.fontStyle = "italic";
      h.appendChild(renderInline(item.content));
      frag.appendChild(h);
    } else if (item.type === "verse") {
      frag.appendChild(renderVerse(item));
    }
    // top-level line_break: verses are block-level with their own
    // spacing already, so we don't need to render anything extra here.
  }

  els.verses.appendChild(frag);

  els.prevBtn.disabled = state.chapter === 1 && book.order === 1;
  els.nextBtn.disabled =
    state.chapter === book.numberOfChapters &&
    book.order === Math.max(...state.books.map((b) => b.order));

  if (state.selectedVerse) {
    const el = els.verses.querySelector(`[data-verse="${state.selectedVerse}"]`);
    if (el) el.classList.add("selected");
  }
}

function renderVerse(verseItem) {
  const div = document.createElement("div");
  div.className = "verse";
  div.dataset.verse = String(verseItem.number);
  div.tabIndex = 0;
  div.setAttribute("role", "button");
  div.setAttribute("aria-label", `Verse ${verseItem.number}`);

  const num = document.createElement("sup");
  num.className = "verse-num";
  num.textContent = String(verseItem.number);
  div.appendChild(num);

  const text = document.createElement("span");
  text.className = "vtext";
  text.appendChild(renderInline(verseItem.content));
  div.appendChild(text);

  const activate = () => selectVerse(verseItem.number);
  div.addEventListener("click", activate);
  div.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  });

  return div;
}

/** Renders a verse/heading content array (strings, formatted text, inline
 * headings, line breaks, footnote refs) into a DocumentFragment. */
function renderInline(items) {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    if (typeof item === "string") {
      frag.appendChild(document.createTextNode(item));
    } else if ("text" in item) {
      const span = document.createElement("span");
      if (item.wordsOfJesus) span.className = "jesus";
      span.textContent = item.text;
      frag.appendChild(span);
    } else if ("heading" in item) {
      const em = document.createElement("em");
      em.textContent = item.heading;
      frag.appendChild(em);
    } else if ("lineBreak" in item) {
      frag.appendChild(document.createElement("br"));
    } else if ("noteId" in item) {
      const note = state.chapterFootnotes.get(item.noteId);
      const sup = document.createElement("sup");
      sup.className = "footnote-mark";
      sup.textContent = note && note.caller && note.caller !== "+" ? note.caller : "*";
      if (note) sup.title = note.text;
      frag.appendChild(sup);
    }
  }
  return frag;
}

/* ----------------------------------------------------------------
 * Verse selection + commentary panel
 * ---------------------------------------------------------------- */

function selectVerse(verseNum) {
  state.selectedVerse = verseNum;

  els.verses.querySelectorAll(".verse.selected").forEach((el) => el.classList.remove("selected"));
  const el = els.verses.querySelector(`[data-verse="${verseNum}"]`);
  if (el) el.classList.add("selected");

  const book = state.booksById.get(state.bookId);
  els.commentaryRef.textContent = `${book.commonName} ${state.chapter}:${verseNum}`;

  renderCommentaryTabs();
  loadCommentary();
  openMobileSheet();
}

function renderCommentaryTabs() {
  els.commentaryTabs.innerHTML = COMMENTARY_ORDER.map((id) => {
    const meta = COMMENTARY_META[id];
    const active = id === state.commentaryId ? " active" : "";
    return `<button class="commentary-tab${active}" data-id="${id}">${escapeHtml(meta.label)}<span class="era">${escapeHtml(meta.era)}</span></button>`;
  }).join("");

  els.commentaryTabs.querySelectorAll(".commentary-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.commentaryId = btn.dataset.id;
      savePosition();
      els.commentaryTabs
        .querySelectorAll(".commentary-tab")
        .forEach((b) => b.classList.toggle("active", b === btn));
      loadCommentary();
    });
  });
}

async function loadCommentary() {
  const verseNum = state.selectedVerse;
  const commentaryId = state.commentaryId;
  const meta = COMMENTARY_META[commentaryId];

  els.commentaryBody.innerHTML = `<p class="hint">Loading ${escapeHtml(meta.author)}…</p>`;

  let data;
  try {
    data = await api.getCommentaryChapter(commentaryId, state.bookId, state.chapter);
  } catch (err) {
    els.commentaryBody.innerHTML = `<p class="error">Couldn't load this commentary (${escapeHtml(err.message)}).</p>`;
    return;
  }

  if (!data) {
    els.commentaryBody.innerHTML = `<p class="hint">${escapeHtml(meta.author)} doesn't cover this book.</p>`;
    return;
  }

  // Older commentaries (Henry, Gill, Calvin) often comment on a *range*
  // of verses under the first verse number in that range. If the exact
  // verse we want has no entry, walk backward to the nearest one that does.
  const verseMap = new Map(
    data.chapter.content.filter((c) => c.type === "verse").map((c) => [c.number, c])
  );
  let usedVerse = verseNum;
  while (usedVerse > 0 && !verseMap.has(usedVerse)) usedVerse--;

  if (!verseMap.has(usedVerse)) {
    els.commentaryBody.innerHTML = `<p class="hint">No note from ${escapeHtml(meta.author)} on this passage.</p>`;
    return;
  }

  const verseData = verseMap.get(usedVerse);
  const rangeNote =
    usedVerse !== verseNum
      ? `<p class="commentary-note">Comment covers verses beginning at v.${usedVerse}.</p>`
      : "";

  const paragraphs = flattenText(verseData.content)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const body = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
  const website = data.commentary.website;

  els.commentaryBody.innerHTML =
    rangeNote +
    body +
    `<div class="commentary-attrib">${escapeHtml(meta.author)}, <em>${escapeHtml(data.commentary.name)}</em>
      ${website ? `— <a href="${website}" target="_blank" rel="noopener">source</a>` : ""}. Public domain / openly licensed.
    </div>`;
}

function flattenText(content) {
  return content
    .map((c) => (typeof c === "string" ? c : "text" in c ? c.text : ""))
    .join("\n\n");
}

/* ----------------------------------------------------------------
 * Mobile bottom-sheet behaviour for the commentary rail
 * ---------------------------------------------------------------- */

function openMobileSheet() {
  if (window.innerWidth > 980) return;
  els.rail.classList.add("open");
  els.scrim.classList.add("show");
}

function closeMobileSheet() {
  els.rail.classList.remove("open");
  els.scrim.classList.remove("show");
}

/* ---------------------------------------------------------------- */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}
