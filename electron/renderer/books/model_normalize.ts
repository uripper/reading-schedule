import { dayKey } from "../calendar/utils.js";
import { uid } from "../dom.js";
import { normalizeShelfName } from "./shelf.js";
import { BOOK_STATUS_READ, statusFromRaw } from "./status.js";
import type { Book, BookInput } from "./types.js";
import { clamp, toInt, toOptionalDate, toOptionalInt } from "./utils.js";

const DEFAULT_PRIORITY = 3;
const DEFAULT_DIFFICULTY = 3;
const MIN_PRIORITY = 1;
const MAX_PRIORITY = 5;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const DEFAULT_MIN_BLOCKS = 1;
const PROGRESS_MAX = 100;
const PROGRESS_SCALE = 10;

function toTrimmedText(value?: string | null): string {
  return String(value ?? "").trim();
}

function toBookId(value?: string): string {
  const text = toTrimmedText(value);
  if (text) {
    return text;
  }
  return uid();
}

function toIntWithFallback(value: number | undefined, fallback: number): number {
  return toInt(value ?? fallback, fallback);
}

function toClampedInt(
  value: number | undefined,
  fallback: number,
  minValue: number,
  maxValue: number,
): number {
  return clamp(toIntWithFallback(value, fallback), minValue, maxValue);
}

function minBlocksPerSession(value: number | undefined): number {
  return Math.max(DEFAULT_MIN_BLOCKS, toIntWithFallback(value, DEFAULT_MIN_BLOCKS));
}

function withNullableString(value: string | null | undefined): string | null {
  if (value) {
    return value;
  }
  return null;
}

function normalizeFinishedAt(value: string | null | undefined): string | null {
  return withNullableString(toTrimmedText(value));
}

function todayDateKey(): string {
  return dayKey(new Date());
}

function finishedAtForStatus(
  status: string,
  finishedAtRaw: string | null | undefined,
): string | null {
  const finishedAt = normalizeFinishedAt(finishedAtRaw);
  if (status !== BOOK_STATUS_READ) {
    return null;
  }
  if (finishedAt) {
    return finishedAt;
  }
  return todayDateKey();
}

function normalizeProgressAndPages(
  pagesTotal: number | null,
  pagesRead: number | null,
  progressRaw: number,
): { pagesRead: number | null; progress: number } {
  let nextPagesRead = pagesRead;
  if (pagesTotal && nextPagesRead === null) {
    nextPagesRead = Math.round((progressRaw / PROGRESS_MAX) * pagesTotal);
  }
  if (pagesTotal && nextPagesRead !== null) {
    nextPagesRead = clamp(nextPagesRead, 0, pagesTotal);
  }
  let progress = Math.round(progressRaw * PROGRESS_SCALE) / PROGRESS_SCALE;
  if (pagesTotal) {
    progress =
      Math.round(
        ((nextPagesRead || 0) / pagesTotal) * PROGRESS_MAX * PROGRESS_SCALE,
      ) / PROGRESS_SCALE;
  }
  return { pagesRead: nextPagesRead, progress };
}

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

export function bookCoverSrc(book: BookInput): string {
  return book.cover_local_path || book.cover_url || "";
}
