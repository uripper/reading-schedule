import type { Book, BookInput } from "../../types/types.ts";
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
} from "./model_normalize_helpers.ts";
import { normalizeScheduledDays } from "./scheduled_days.ts";
import { normalizeShelfName } from "./shelf.ts";
import { statusFromRaw } from "./status.ts";
import { clamp, toOptionalDate, toOptionalInt } from "./utils.ts";

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
        difficulty: toClampedInt({
            fallback: DEFAULT_DIFFICULTY,
            maxValue: MAX_DIFFICULTY,
            minValue: MIN_DIFFICULTY,
            value: book.difficulty,
        }),
        finished_at: finishedAtForStatus(STATUS, book.finished_at),
        lookup_note: toTrimmedText(book.lookup_note),
        max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
        min_blocks_per_session: minBlocksPerSession(
            book.min_blocks_per_session,
        ),
        pages_read: NORMALIZED.pagesRead,
        pages_total: PAGES_TOTAL,
        priority: toClampedInt({
            fallback: DEFAULT_PRIORITY,
            maxValue: MAX_PRIORITY,
            minValue: MIN_PRIORITY,
            value: book.priority,
        }),
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
