import { statusFromRaw } from "./status.js";
import type { Book } from "./types.js";

const DEFAULT_PRIORITY = 3;
const DEFAULT_DIFFICULTY = 3;
const DEFAULT_MIN_BLOCKS = 1;

/**
 * Returns numeric value when defined, otherwise a provided default.
 *
 * @param value Optional numeric value.
 * @param fallback Default number when value is undefined.
 * @returns `value` when defined; otherwise `fallback`.
 */
function withDefaultNumber(value: number | undefined, fallback: number): number {
  if (value !== undefined) {
    return value;
  }
  return fallback;
}

/**
 * Normalizes optional text fields to non-null strings.
 *
 * @param value Optional text value.
 * @returns Original text when truthy; otherwise empty string.
 */
function withDefaultString(value: string | null | undefined): string {
  if (value) {
    return value;
  }
  return "";
}

/**
 * Normalizes optional text to nullable string for payload fields.
 *
 * @param value Optional text value.
 * @returns Original text when truthy; otherwise `null`.
 */
function withNullableString(value: string | null | undefined): string | null {
  if (value) {
    return value;
  }
  return null;
}

/**
 * Normalizes `finished_at` text to a nullable trimmed value.
 *
 * @param value Raw finished date text.
 * @returns Trimmed date string or `null`.
 */
function normalizeFinishedAt(value: string | null | undefined): string | null {
  return withNullableString(String(value ?? "").trim());
}

/**
 * Converts a normalized book model into persistence/planner payload shape.
 *
 * @param book Source book model.
 * @returns Payload-safe book with defaults and nullable fields normalized.
 */
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
    min_blocks_per_session: withDefaultNumber(
      book.min_blocks_per_session,
      DEFAULT_MIN_BLOCKS,
    ),
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

/**
 * Checks whether a book has enough length metadata to be schedulable.
 *
 * @param book Book model to inspect.
 * @returns `true` when words or page totals are positive.
 */
export function hasSchedulableLength(book: Book): boolean {
  return (book.words_total || 0) > 0 || (book.pages_total || 0) > 0;
}

/**
 * Clears `blocked_by` links that point to missing books in the same payload.
 *
 * @param books Books intended for persistence/scheduling.
 * @returns Books with invalid blocking links reset to `null`.
 */
export function clearMissingBlockedBy(books: Book[]): Book[] {
  const schedulableIds = new Set<string>();
  books.forEach((book) => {
    schedulableIds.add(book.book_id);
  });

  return books.map((book) => {
    const blockedById = String(book.blocked_by || "").trim();
    if (!blockedById) {
      return book;
    }
    if (schedulableIds.has(blockedById)) {
      return book;
    }
    return {
      ...book,
      blocked_by: null,
    };
  });
}
