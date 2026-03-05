import type { Book, BookInput } from "../../types/types.js";
import {
    DEFAULT_DIFFICULTY,
    DEFAULT_PRIORITY,
    finishedAtForStatus,
    MAX_DIFFICULTY,
    MAX_PRIORITY,
    MIN_DIFFICULTY,
    MIN_PRIORITY,
    minBlocksPerSession,
    normalizeProgressAndPages,
    toBookId,
    toClampedInt,
    toTrimmedText,
    withNullableString,
} from "./model_normalize_helpers.js";
import { normalizeScheduledDays } from "./scheduled_days.js";
import { normalizeShelfName } from "./shelf.js";
import { statusFromRaw } from "./status.js";
import { clamp, toOptionalDate, toOptionalInt } from "./utils.js";

const PROGRESS_MAX = 100;

/**
 * Normalizes raw/partial book input into canonical book model shape.
 * @param book - Partial book input from storage, form, or IPC payload.
 * @returns Normalized book with clamped numeric fields and consistent status data.
 */
export function normalizeBook(book: BookInput = {}): Book {
    const WORDS_TOTAL = toOptionalInt(book.words_total);
    const PAGES_TOTAL = toOptionalInt(book.pages_total);
    const PROGRESS_RAW = clamp(
        Number(book.progress_percent ?? 0),
        0,
        PROGRESS_MAX,
    );
    const PAGES_READ_RAW = toOptionalInt(book.pages_read);
    const NORMALIZED = normalizeProgressAndPages(
        PAGES_TOTAL,
        PAGES_READ_RAW,
        PROGRESS_RAW,
    );
    const STATUS = statusFromRaw(book.status, NORMALIZED.progress);

    return {
        author: toTrimmedText(book.author),
        blocked_by: withNullableString(toTrimmedText(book.blocked_by)),
        book_id: toBookId(book.book_id),
        cover_local_path: toTrimmedText(book.cover_local_path),
        cover_url: toTrimmedText(book.cover_url),
        deadline: toOptionalDate(book.deadline),
        difficulty: toClampedInt(
            book.difficulty,
            DEFAULT_DIFFICULTY,
            MIN_DIFFICULTY,
            MAX_DIFFICULTY,
        ),
        finished_at: finishedAtForStatus(STATUS, book.finished_at),
        lookup_note: toTrimmedText(book.lookup_note),
        max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
        min_blocks_per_session: minBlocksPerSession(
            book.min_blocks_per_session,
        ),
        pages_read: NORMALIZED.pagesRead,
        pages_total: PAGES_TOTAL,
        priority: toClampedInt(
            book.priority,
            DEFAULT_PRIORITY,
            MIN_PRIORITY,
            MAX_PRIORITY,
        ),
        progress_percent: NORMALIZED.progress,
        scheduled_days: normalizeScheduledDays(book.scheduled_days),
        shelf: normalizeShelfName(book.shelf),
        status: STATUS,
        title: toTrimmedText(book.title),
        words_total: WORDS_TOTAL,
    };
}

/**
 * Resolves preferred cover source path for rendering.
 * @param book - Book-like input containing cover fields.
 * @returns Local cover path when available, otherwise remote URL or empty string.
 */
export function bookCoverSrc(book: BookInput): string {
    return book.cover_local_path ?? book.cover_url ?? "";
}
