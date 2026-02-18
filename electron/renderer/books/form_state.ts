// @ts-nocheck
import { uid } from "../dom.js";
import { noteFromLookup, syncProgressAndPages } from "../book_lookup.js";
import { COVER_PLACEHOLDER } from "./constants.js";
import { bookCoverSrc, normalizeBook } from "./model.js";
import { clamp, toOptionalInt } from "./utils.js";

function setCoverPreview(refs, src) {
  refs.coverPreview.src = src || COVER_PLACEHOLDER;
  refs.coverPreview.classList.toggle("is-empty", !src);
}

export function clearForm(refs, lookupControl) {
  refs.form.reset();
  refs.bookId.value = "";
  refs.coverUrl.value = "";
  refs.coverLocal.value = "";
  refs.author.value = "";
  refs.lookupMeta.dataset.lookupNote = "";
  refs.lookupMeta.textContent = "";
  refs.progressInput.value = "0";
  refs.priorityInput.value = "3";
  refs.difficultyInput.value = "3";
  refs.minBlocksInput.value = "1";
  setCoverPreview(refs, "");
  lookupControl.clearResults();
}

export function fillForm(refs, book) {
  refs.bookId.value = book.book_id;
  refs.titleInput.value = book.title || "";
  refs.wordsInput.value = "";
  if (book.words_total) {
    refs.wordsInput.value = String(book.words_total);
  }
  refs.pagesTotalInput.value = "";
  if (book.pages_total) {
    refs.pagesTotalInput.value = String(book.pages_total);
  }
  refs.pagesReadInput.value = "";
  if (book.pages_read !== null && book.pages_read !== undefined) {
    refs.pagesReadInput.value = String(book.pages_read);
  }
  refs.progressInput.value = String(book.progress_percent ?? 0);
  refs.priorityInput.value = String(book.priority || 3);
  refs.difficultyInput.value = String(book.difficulty || 3);
  refs.minBlocksInput.value = String(book.min_blocks_per_session || 1);
  refs.maxMinutesInput.value = "";
  if (book.max_minutes_per_day) {
    refs.maxMinutesInput.value = String(book.max_minutes_per_day);
  }
  refs.deadlineInput.value = book.deadline || "";
  refs.coverUrl.value = book.cover_url || "";
  refs.coverLocal.value = book.cover_local_path || "";
  refs.author.value = book.author || "";
  refs.lookupMeta.dataset.lookupNote = book.lookup_note || "";
  refs.lookupMeta.textContent = book.lookup_note || "";
  refs.searchInput.value = book.title || "";
  setCoverPreview(refs, bookCoverSrc(book));
}

export function parseFormBook(refs) {
  const title = refs.titleInput.value.trim();
  if (!title) throw new Error("Title is required.");
  const wordsTotal = toOptionalInt(refs.wordsInput.value);
  const pagesTotal = toOptionalInt(refs.pagesTotalInput.value);
  let pagesRead = toOptionalInt(refs.pagesReadInput.value);
  let progress = clamp(Number(refs.progressInput.value || 0), 0, 100);
  if (!wordsTotal && !pagesTotal) throw new Error("Enter estimated words or total pages.");
  if (pagesTotal) {
    pagesRead = pagesRead ?? Math.round((progress / 100) * pagesTotal);
    pagesRead = clamp(pagesRead, 0, pagesTotal);
    progress = Math.round(((pagesRead / pagesTotal) * 100) * 10) / 10;
  } else pagesRead = null;

  return normalizeBook({
    book_id: refs.bookId.value || uid(), title, author: refs.author.value.trim(), words_total: wordsTotal,
    pages_total: pagesTotal, pages_read: pagesRead, progress_percent: progress, priority: refs.priorityInput.value,
    difficulty: refs.difficultyInput.value, min_blocks_per_session: refs.minBlocksInput.value,
    max_minutes_per_day: refs.maxMinutesInput.value, deadline: refs.deadlineInput.value,
    cover_url: refs.coverUrl.value.trim(), cover_local_path: refs.coverLocal.value.trim(),
    lookup_note: refs.lookupMeta.dataset.lookupNote || "",
  });
}

export function applyLookupItem(refs, item) {
  refs.titleInput.value = item.title || refs.titleInput.value;
  refs.searchInput.value = item.title || refs.searchInput.value;
  refs.author.value = item.author || refs.author.value;
  refs.coverUrl.value = item.cover_url || "";
  refs.coverLocal.value = "";
  if (!toOptionalInt(refs.wordsInput.value) && item.words_estimate) refs.wordsInput.value = String(item.words_estimate);
  if (!toOptionalInt(refs.pagesTotalInput.value) && item.pages_estimate) refs.pagesTotalInput.value = String(item.pages_estimate);
  refs.lookupMeta.dataset.lookupNote = noteFromLookup(item);
  refs.lookupMeta.textContent = noteFromLookup(item);
  setCoverPreview(refs, item.cover_url || "");
  syncProgressAndPages(refs, "pages");
}
