import { normalizeShelfName } from "./shelf.js";
import { statusFromRaw } from "./status.js";
import type { Book, BookInput } from "./types.js";
import { clamp, toOptionalDate, toOptionalInt } from "./utils.js";
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_PRIORITY,
  MAX_DIFFICULTY,
  MAX_PRIORITY,
  MIN_DIFFICULTY,
  MIN_PRIORITY,
  finishedAtForStatus,
  minBlocksPerSession,
  normalizeProgressAndPages,
  toBookId,
  toClampedInt,
  toTrimmedText,
  withNullableString,
} from "./model_normalize_helpers.js";

const PROGRESS_MAX = 100;

/**
 * Normalizes raw/partial book input into canonical book model shape.
 * @param book Partial book input from storage, form, or IPC payload.
 * @returns Normalized book with clamped numeric fields and consistent status data.
 */
export function normalizeBook(book: BookInput = {}): Book {
  const wordsTotal = toOptionalInt(book.words_total);
  const pagesTotal = toOptionalInt(book.pages_total);
  const progressRaw = clamp(Number(book.progress_percent ?? 0), 0, PROGRESS_MAX);
  const pagesReadRaw = toOptionalInt(book.pages_read);
  const normalized = normalizeProgressAndPages(pagesTotal, pagesReadRaw, progressRaw);
  const status = statusFromRaw(book.status, normalized.progress);

  return {
    status,
    book_id: toBookId(book.book_id),
    title: toTrimmedText(book.title),
    author: toTrimmedText(book.author),
    words_total: wordsTotal,
    pages_total: pagesTotal,
    pages_read: normalized.pagesRead,
    progress_percent: normalized.progress,
    priority: toClampedInt(book.priority, DEFAULT_PRIORITY, MIN_PRIORITY, MAX_PRIORITY),
    difficulty: toClampedInt(
      book.difficulty,
      DEFAULT_DIFFICULTY,
      MIN_DIFFICULTY,
      MAX_DIFFICULTY,
    ),
    min_blocks_per_session: minBlocksPerSession(book.min_blocks_per_session),
    max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
    deadline: toOptionalDate(book.deadline),
    blocked_by: withNullableString(toTrimmedText(book.blocked_by)),
    shelf: normalizeShelfName(book.shelf),
    finished_at: finishedAtForStatus(status, book.finished_at),
    cover_url: toTrimmedText(book.cover_url),
    cover_local_path: toTrimmedText(book.cover_local_path),
    lookup_note: toTrimmedText(book.lookup_note),
  };
}

/**
 * Resolves preferred cover source path for rendering.
 * @param book Book-like input containing cover fields.
 * @returns Local cover path when available, otherwise remote URL or empty string.
 */
export function bookCoverSrc(book: BookInput): string {
  return (book.cover_local_path ?? book.cover_url) ?? "";
}
