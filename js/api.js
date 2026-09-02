// api.js
// Thin wrapper around the Free Use Bible API (https://bible.helloao.org/docs/).
// No API key, no rate limits, MIT-licensed project, public-domain / openly
// licensed content. Every function returns parsed JSON or throws.
//
// This is the ONLY file that knows about the network. If you ever want to
// swap data sources (self-host a copy, use a different translation host,
// add another commentary provider) this is the file to change.

const API_BASE = "https://bible.helloao.org/api";

const cache = new Map();

async function getJSON(url, { allowMissing = false } = {}) {
  if (cache.has(url)) return cache.get(url);

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Network error fetching ${url}: ${err.message}`);
  }

  if (!res.ok) {
    if (allowMissing && res.status === 404) {
      cache.set(url, null);
      return null;
    }
    throw new Error(`Request failed (${res.status}) for ${url}`);
  }

  const data = await res.json();
  cache.set(url, data);
  return data;
}

/** List every translation the API knows about (1000+, most non-English). */
export function getAvailableTranslations() {
  return getJSON(`${API_BASE}/available_translations.json`);
}

/** List of books for one translation, in canonical order. */
export function getBooks(translationId) {
  return getJSON(`${API_BASE}/${translationId}/books.json`);
}

/** A single chapter, standard format (has the wordsOfJesus flags we need). */
export function getChapter(translationId, bookId, chapterNum) {
  return getJSON(`${API_BASE}/${translationId}/${bookId}/${chapterNum}.json`);
}

/** The seven public-domain / openly-licensed commentaries the API serves. */
export function getAvailableCommentaries() {
  return getJSON(`${API_BASE}/available_commentaries.json`);
}

/** Books available within a specific commentary (not every commentary covers every book). */
export function getCommentaryBooks(commentaryId) {
  return getJSON(`${API_BASE}/c/${commentaryId}/books.json`, { allowMissing: true });
}

/**
 * A single chapter of commentary. Returns null (not a throw) if this
 * commentary doesn't cover this book/chapter, so callers can render a
 * friendly "not covered" message instead of an error.
 */
export function getCommentaryChapter(commentaryId, bookId, chapterNum) {
  return getJSON(`${API_BASE}/c/${commentaryId}/${bookId}/${chapterNum}.json`, {
    allowMissing: true,
  });
}
