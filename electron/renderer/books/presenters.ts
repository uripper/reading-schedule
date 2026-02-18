// @ts-nocheck
import { WORDS_PER_PAGE } from "./constants.js";
import { formatInt } from "./utils.js";

export function progressLabel(book) {
  const pct = Number(book.progress_percent || 0);
  let pages = "Pages n/a";
  if (book.pages_total) {
    pages = `${formatInt(book.pages_read || 0)}/${formatInt(book.pages_total)} pages`;
  }
  return `${pct.toFixed(1)}% · ${pages}`;
}

export function wordsLabel(book) {
  if (book.words_total) {
    return `${formatInt(book.words_total)} words`;
  }
  if (book.pages_total) {
    return `${formatInt(book.pages_total * WORDS_PER_PAGE)} word estimate`;
  }
  return "No word estimate";
}

export function metaLabel(book) {
  const bits = [`Priority ${book.priority}`, `Difficulty ${book.difficulty}`];
  if (book.deadline) {
    bits.push(`Due ${book.deadline}`);
  }
  if (book.blocked_by) {
    bits.push(`After ${book.blocked_by}`);
  }
  return bits.join(" · ");
}

export function subtitle(book) {
  return book.author || book.lookup_note || "No author metadata";
}
