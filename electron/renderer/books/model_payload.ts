import type { Book } from "../../types/types.ts";
import { withNullableString } from "./model_normalize_helpers.ts";
import { normalizeScheduledDays } from "./scheduled_days.ts";
import { statusFromRaw } from "./status.ts";

const DEFAULT_PRIORITY = 3;
const DEFAULT_DIFFICULTY = 3;
const DEFAULT_MIN_BLOCKS = 1;

type PlannerPayloadNumericFields = Partial<Book> & {
    remaining_words: number | null;
};

/**
 * Returns numeric value when defined, otherwise a provided default.
 * @param value - Optional numeric value.
 * @param fallback - Default number when value is undefined.
 * @returns `value` when defined; otherwise `fallback`.
 */
function withDefaultNumber(
    value: number | undefined,
    fallback: number,
): number {
    if (value !== undefined) {
        return value;
    }
    return fallback;
}

/**
 * Normalizes optional text fields to non-null strings.
 * @param value - Optional text value.
 * @returns Original text when truthy; otherwise empty string.
 */
function withDefaultString(value: string | null | undefined): string {
    if (value !== null && value !== undefined && value !== "") {
        return value;
    }
    return "";
}

/**
 * Normalizes `finished_at` text to a nullable trimmed value.
 * @param value - Raw finished date text.
 * @returns Trimmed date string or `null`.
 */
function normalizeFinishedAt(value: string | null | undefined): string | null {
    return withNullableString(String(value ?? "").trim());
}

function payloadTextFields(book: Book, status: Book["status"]): Partial<Book> {
    return {
        author: withDefaultString(book.author),
        blocked_by: withNullableString(book.blocked_by),
        book_id: book.book_id,
        cover_local_path: withDefaultString(book.cover_local_path),
        cover_url: withDefaultString(book.cover_url),
        deadline: withNullableString(book.deadline),
        finished_at: normalizeFinishedAt(book.finished_at),
        lookup_note: withDefaultString(book.lookup_note),
        shelf: withDefaultString(book.shelf),
        status,
        title: book.title,
    };
}

function payloadNumericFields(book: Book): PlannerPayloadNumericFields {
    const WORDS_TOTAL = book.words_total ?? null;
    return {
        difficulty: withDefaultNumber(book.difficulty, DEFAULT_DIFFICULTY),
        max_minutes_per_day: book.max_minutes_per_day ?? null,
        min_blocks_per_session: withDefaultNumber(
            book.min_blocks_per_session,
            DEFAULT_MIN_BLOCKS,
        ),
        pages_read: book.pages_read ?? null,
        pages_total: book.pages_total ?? null,
        priority: withDefaultNumber(book.priority, DEFAULT_PRIORITY),
        progress_percent: book.progress_percent,
        remaining_words: book.remaining_words ?? WORDS_TOTAL,
        scheduled_days: normalizeScheduledDays(book.scheduled_days),
        words_total: WORDS_TOTAL,
    };
}

/**
 * Converts a normalized book model into persistence/planner payload shape.
 * @param book - Source book model.
 * @returns Payload-safe book with defaults and nullable fields normalized.
 */
export function toPayloadBook(book: Book): Book {
    const STATUS = statusFromRaw(
        book.status,
        Number(book.progress_percent || 0),
    );
    return {
        ...payloadTextFields(book, STATUS),
        ...payloadNumericFields(book),
    } as Book;
}

/**
 * Checks whether a book has enough length metadata to be schedulable.
 * @param book - Book model to inspect.
 * @returns `true` when words or page totals are positive.
 */
export function hasSchedulableLength(book: Book): boolean {
    return (book.words_total ?? 0) > 0 || (book.pages_total ?? 0) > 0;
}

/**
 * Clears `blocked_by` links that point to missing books in the same payload.
 * @param books - Books intended for persistence/scheduling.
 * @returns Books with invalid blocking links reset to `null`.
 */
export function clearMissingBlockedBy(books: Book[]): Book[] {
    const SCHEDULABLE_IDS = new Set<string>();

    for (const BOOK of books) {
        SCHEDULABLE_IDS.add(BOOK.book_id);
    }

    return books.map((book) => {
        return clearedBlockedByBook(book, SCHEDULABLE_IDS);
    });
}

function clearedBlockedByBook(book: Book, schedulableIds: Set<string>): Book {
    const BLOCKED_BY_ID = String(book.blocked_by ?? "").trim();
    if (BLOCKED_BY_ID === "" || schedulableIds.has(BLOCKED_BY_ID)) {
        return book;
    }
    return {
        ...book,
        blocked_by: null,
    };
}
