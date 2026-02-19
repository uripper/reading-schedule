
import { uid } from "../dom.js";
import { dayKey } from "../calendar/utils.js";
import { noteFromLookup, syncProgressAndPages } from "../book_lookup.js";
import { COVER_PLACEHOLDER } from "./constants.js";
import { bookCoverSrc, normalizeBook } from "./model.js";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  type BookStatus,
} from "./status.js";
import { clamp, toOptionalInt } from "./utils.js";
import type { Book } from "./types.js";
import type { BookFormRefs } from "./form_refs.js";
import type { BookLookupItem } from "../app/types.js";
import type { ProgressSyncInputs } from "../book_lookup/helpers.js";

const DEFAULT_PROGRESS = "0";
const DEFAULT_PRIORITY = "3";
const DEFAULT_DIFFICULTY = "3";
const DEFAULT_MIN_BLOCKS = "1";
const DEFAULT_STATUS = BOOK_STATUS_TO_READ;
const PROGRESS_MAX = 100;
const PROGRESS_DECIMAL_SCALE = 10;

type LookupControl = {
  clearResults: () => void;
};

function todayDateKey(): string {
  return dayKey(new Date());
}

function setCoverPreview(refs: BookFormRefs, src: string): void {
  refs.coverPreview.src = src || COVER_PLACEHOLDER;
  refs.coverPreview.classList.toggle("is-empty", !src);
}

function setOptionalIntegerInputValue(inputNode: HTMLInputElement, value: number | null | undefined): void {
  inputNode.value = "";
  if (value === null || value === undefined) {
    return;
  }
  inputNode.value = String(value);
}

function fallbackText(value: string | null | undefined, fallback = ""): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return value;
}

function fallbackNumberText(value: number | null | undefined, fallback: string): string {
  if (value === null || value === undefined || value === 0) {
    return fallback;
  }
  return String(value);
}

function requiredTitle(refs: BookFormRefs): string {
  const title = refs.titleInput.value.trim();
  if (!title) {
    throw new Error("Title is required.");
  }
  return title;
}

function validatedStatusSelection(refs: BookFormRefs): BookStatus {
  const raw = String(refs.statusSelectInput.value || "").trim();
  if (raw === BOOK_STATUS_READ) {
    return BOOK_STATUS_READ;
  }
  if (raw === BOOK_STATUS_IN_PROGRESS) {
    return BOOK_STATUS_IN_PROGRESS;
  }
  if (raw === BOOK_STATUS_DROPPED) {
    return BOOK_STATUS_DROPPED;
  }
  return BOOK_STATUS_TO_READ;
}

function toggleFinishedAtInput(refs: BookFormRefs, status: BookStatus): void {
  const isRead = status === BOOK_STATUS_READ;
  refs.finishedAtField.hidden = !isRead;
  refs.finishedAtInput.disabled = !isRead;
  if (!isRead) {
    return;
  }
  if (refs.finishedAtInput.value) {
    return;
  }
  refs.finishedAtInput.value = todayDateKey();
}

export function syncFinishedAtField(refs: BookFormRefs): void {
  const status = validatedStatusSelection(refs);
  toggleFinishedAtInput(refs, status);
}

function deriveLengthAndProgress(refs: BookFormRefs): {
  wordsTotal: number | null;
  pagesTotal: number | null;
  pagesRead: number | null;
  progress: number;
} {
  const wordsTotal = toOptionalInt(refs.wordsInput.value);
  const pagesTotal = toOptionalInt(refs.pagesTotalInput.value);
  let pagesRead = toOptionalInt(refs.pagesReadInput.value);
  let progress = clamp(Number(refs.progressInput.value || 0), 0, PROGRESS_MAX);
  if (!wordsTotal && !pagesTotal) {
    throw new Error("Enter estimated words or total pages.");
  }
  if (pagesTotal) {
    if (pagesRead === null || pagesRead === undefined) {
      pagesRead = Math.round((progress / PROGRESS_MAX) * pagesTotal);
    }
    pagesRead = clamp(pagesRead, 0, pagesTotal);
    progress = Math.round(((pagesRead / pagesTotal) * PROGRESS_MAX) * PROGRESS_DECIMAL_SCALE) / PROGRESS_DECIMAL_SCALE;
    return {
      wordsTotal,
      pagesTotal,
      pagesRead,
      progress,
    };
  }
  return {
    wordsTotal,
    pagesTotal,
    progress,
    pagesRead: null,
  };
}

function validatedShelfSelection(refs: BookFormRefs): string {
  const shelf = refs.shelfSelectInput.value;
  if (shelf === SHELF_SELECT_CREATE_NEW) {
    throw new Error("Choose a shelf or create a new one from the shelf selector.");
  }
  return shelf;
}

export function clearForm(refs: BookFormRefs, lookupControl: LookupControl): void {
  refs.form.reset();
  refs.bookId.value = "";
  refs.coverUrl.value = "";
  refs.coverLocal.value = "";
  refs.author.value = "";
  refs.lookupMeta.dataset.lookupNote = "";
  refs.lookupMeta.textContent = "";
  refs.progressInput.value = DEFAULT_PROGRESS;
  refs.priorityInput.value = DEFAULT_PRIORITY;
  refs.difficultyInput.value = DEFAULT_DIFFICULTY;
  refs.minBlocksInput.value = DEFAULT_MIN_BLOCKS;
  refs.afterBookInput.value = "";
  refs.blockedByInput.value = "";
  refs.statusSelectInput.value = DEFAULT_STATUS;
  refs.finishedAtInput.value = "";
  syncFinishedAtField(refs);
  refs.shelfSelectInput.value = "";
  setCoverPreview(refs, "");
  lookupControl.clearResults();
}

export function fillForm(refs: BookFormRefs, book: Book): void {
  refs.bookId.value = book.book_id;
  refs.titleInput.value = fallbackText(book.title);
  setOptionalIntegerInputValue(refs.wordsInput, book.words_total);
  setOptionalIntegerInputValue(refs.pagesTotalInput, book.pages_total);
  setOptionalIntegerInputValue(refs.pagesReadInput, book.pages_read);
  refs.progressInput.value = fallbackNumberText(book.progress_percent, DEFAULT_PROGRESS);
  refs.priorityInput.value = fallbackNumberText(book.priority, DEFAULT_PRIORITY);
  refs.difficultyInput.value = fallbackNumberText(book.difficulty, DEFAULT_DIFFICULTY);
  refs.minBlocksInput.value = fallbackNumberText(book.min_blocks_per_session, DEFAULT_MIN_BLOCKS);
  setOptionalIntegerInputValue(refs.maxMinutesInput, book.max_minutes_per_day);
  refs.deadlineInput.value = fallbackText(book.deadline);
  refs.blockedByInput.value = fallbackText(book.blocked_by);
  refs.statusSelectInput.value = fallbackText(book.status, DEFAULT_STATUS);
  refs.finishedAtInput.value = fallbackText(book.finished_at);
  syncFinishedAtField(refs);
  refs.coverUrl.value = fallbackText(book.cover_url);
  refs.coverLocal.value = fallbackText(book.cover_local_path);
  refs.author.value = fallbackText(book.author);
  refs.lookupMeta.dataset.lookupNote = fallbackText(book.lookup_note);
  refs.lookupMeta.textContent = fallbackText(book.lookup_note);
  refs.searchInput.value = fallbackText(book.title);
  setCoverPreview(refs, bookCoverSrc(book));
}

export function parseFormBook(refs: BookFormRefs): Book {
  const title = requiredTitle(refs);
  const parsed = deriveLengthAndProgress(refs);
  const shelf = validatedShelfSelection(refs);
  const status = validatedStatusSelection(refs);
  let progress = parsed.progress;
  let pagesRead = parsed.pagesRead;
  if (status === BOOK_STATUS_READ) {
    progress = PROGRESS_MAX;
    if (parsed.pagesTotal) {
      pagesRead = parsed.pagesTotal;
    }
  }

  return normalizeBook({
    title,
    shelf,
    status,
    finished_at: refs.finishedAtInput.value,
    book_id: refs.bookId.value || uid(),
    author: refs.author.value.trim(),
    words_total: parsed.wordsTotal,
    pages_total: parsed.pagesTotal,
    pages_read: pagesRead,
    progress_percent: progress,
    priority: Number(refs.priorityInput.value || DEFAULT_PRIORITY),
    difficulty: Number(refs.difficultyInput.value || DEFAULT_DIFFICULTY),
    min_blocks_per_session: Number(refs.minBlocksInput.value || DEFAULT_MIN_BLOCKS),
    max_minutes_per_day: toOptionalInt(refs.maxMinutesInput.value),
    deadline: refs.deadlineInput.value,
    blocked_by: refs.blockedByInput.value,
    cover_url: refs.coverUrl.value.trim(),
    cover_local_path: refs.coverLocal.value.trim(),
    lookup_note: refs.lookupMeta.dataset.lookupNote || "",
  });
}

export function applyLookupItem(refs: BookFormRefs, item: BookLookupItem): void {
  refs.titleInput.value = item.title || refs.titleInput.value;
  refs.searchInput.value = item.title || refs.searchInput.value;
  refs.author.value = item.author || refs.author.value;
  refs.coverUrl.value = item.cover_url || "";
  refs.coverLocal.value = "";
  if (!toOptionalInt(refs.wordsInput.value) && item.words_estimate) {
    refs.wordsInput.value = String(item.words_estimate);
  }
  if (!toOptionalInt(refs.pagesTotalInput.value) && item.pages_estimate) {
    refs.pagesTotalInput.value = String(item.pages_estimate);
  }
  refs.lookupMeta.dataset.lookupNote = noteFromLookup(item);
  refs.lookupMeta.textContent = noteFromLookup(item);
  setCoverPreview(refs, item.cover_url || "");
  const progressSyncRefs: ProgressSyncInputs = {
    pagesTotalInput: refs.pagesTotalInput,
    pagesReadInput: refs.pagesReadInput,
    progressInput: refs.progressInput,
  };
  syncProgressAndPages(progressSyncRefs, "pages");
}
