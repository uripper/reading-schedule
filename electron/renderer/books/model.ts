
import { uid } from "../dom.js";
import { dayKey } from "../calendar/utils.js";
import { clamp, toInt, toOptionalDate, toOptionalInt } from "./utils.js";
import { normalizeShelfName } from "./shelf.js";
import type { Book, BookInput } from "./types.js";
import { BOOK_STATUS_READ, statusFromRaw } from "./status.js";

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

function toClampedInt(value: number | undefined, fallback: number, minValue: number, maxValue: number): number {
  const parsed = toIntWithFallback(value, fallback);
  return clamp(parsed, minValue, maxValue);
}

function minBlocksPerSession(value: number | undefined): number {
  return Math.max(DEFAULT_MIN_BLOCKS, toIntWithFallback(value, DEFAULT_MIN_BLOCKS));
}

function withDefaultNumber(value: number | undefined, fallback: number): number {
  if (value !== undefined) {
    return value;
  }
  return fallback;
}

function withDefaultString(value: string | null | undefined): string {
  if (value) {
    return value;
  }
  return "";
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

function finishedAtForStatus(status: string, finishedAtRaw: string | null | undefined): string | null {
  const finishedAt = normalizeFinishedAt(finishedAtRaw);
  if (status !== BOOK_STATUS_READ) {
    return null;
  }
  if (finishedAt) {
    return finishedAt;
  }
  return todayDateKey();
}

function normalizeProgressAndPages(pagesTotal: number | null, pagesRead: number | null, progressRaw: number) {
  let nextPagesRead = pagesRead;
  if (pagesTotal && nextPagesRead === null) {
    nextPagesRead = Math.round((progressRaw / PROGRESS_MAX) * pagesTotal);
  }
  if (pagesTotal && nextPagesRead !== null) {
    nextPagesRead = clamp(nextPagesRead, 0, pagesTotal);
  }

  let progress = Math.round(progressRaw * PROGRESS_SCALE) / PROGRESS_SCALE;
  if (pagesTotal) {
    progress = Math.round((((nextPagesRead || 0) / pagesTotal) * PROGRESS_MAX) * PROGRESS_SCALE) / PROGRESS_SCALE;
  }
  return { pagesRead: nextPagesRead, progress };
}

export function normalizeBook(book: BookInput = {}): Book {
  const wordsTotal = toOptionalInt(book.words_total);
  const pagesTotal = toOptionalInt(book.pages_total);
  const progressRaw = clamp(Number(book.progress_percent ?? 0), 0, PROGRESS_MAX);
  const pagesReadRaw = toOptionalInt(book.pages_read);
  const { pagesRead, progress } = normalizeProgressAndPages(pagesTotal, pagesReadRaw, progressRaw);
  const status = statusFromRaw(book.status, progress);
  const finishedAt = finishedAtForStatus(status, book.finished_at);

  return {
    status,
    book_id: toBookId(book.book_id),
    title: toTrimmedText(book.title),
    author: toTrimmedText(book.author),
    words_total: wordsTotal,
    pages_total: pagesTotal,
    pages_read: pagesRead,
    progress_percent: progress,
    priority: toClampedInt(book.priority, DEFAULT_PRIORITY, MIN_PRIORITY, MAX_PRIORITY),
    difficulty: toClampedInt(book.difficulty, DEFAULT_DIFFICULTY, MIN_DIFFICULTY, MAX_DIFFICULTY),
    min_blocks_per_session: minBlocksPerSession(book.min_blocks_per_session),
    max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
    deadline: toOptionalDate(book.deadline),
    blocked_by: withNullableString(toTrimmedText(book.blocked_by)),
    shelf: normalizeShelfName(book.shelf),
    finished_at: finishedAt,
    cover_url: toTrimmedText(book.cover_url),
    cover_local_path: toTrimmedText(book.cover_local_path),
    lookup_note: toTrimmedText(book.lookup_note),
  };
}

export function bookCoverSrc(book: BookInput): string {
  return book.cover_local_path || book.cover_url || "";
}

export function toPayloadBook(book: Book): Book {
  const status = statusFromRaw(book.status, Number(book.progress_percent || 0));
  return {
    status,
    book_id: book.book_id,
    title: book.title,
    words_total: book.words_total ?? null,
    pages_total: book.pages_total ?? null,
    pages_read: book.pages_read ?? null,
    progress_percent: book.progress_percent,
    priority: withDefaultNumber(book.priority, DEFAULT_PRIORITY),
    difficulty: withDefaultNumber(book.difficulty, DEFAULT_DIFFICULTY),
    min_blocks_per_session: withDefaultNumber(book.min_blocks_per_session, DEFAULT_MIN_BLOCKS),
    max_minutes_per_day: book.max_minutes_per_day ?? null,
    deadline: withNullableString(book.deadline),
    blocked_by: withNullableString(book.blocked_by),
    shelf: withDefaultString(book.shelf),
    finished_at: normalizeFinishedAt(book.finished_at),
    author: withDefaultString(book.author),
    cover_url: withDefaultString(book.cover_url),
    cover_local_path: withDefaultString(book.cover_local_path),
    lookup_note: withDefaultString(book.lookup_note),
  };
}

export function hasSchedulableLength(book: Book): boolean {
  return (book.words_total || 0) > 0 || (book.pages_total || 0) > 0;
}
