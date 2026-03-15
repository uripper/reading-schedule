import type { Book, BookInput, BookStatus } from "../../types/types.ts";
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

type NormalizedBookState = {
    wordsTotal: number | null;
    pagesTotal: number | null;
    normalized: ReturnType<typeof normalizeProgressAndPages>;
    status: BookStatus;
};

type NormalizedBookTotals = Pick<
    NormalizedBookState,
    "wordsTotal" | "pagesTotal"
>;

function normalizedTotals(book: BookInput): NormalizedBookTotals {
    return {
        pagesTotal: toOptionalInt(book.pages_total),
        wordsTotal: toOptionalInt(book.words_total),
    };
}

function normalizedProgressRaw(book: BookInput): number {
    return clamp(Number(book.progress_percent ?? 0), 0, PROGRESS_MAX);
}

function normalizedProgressState(
    book: BookInput,
    pagesTotal: number | null,
): ReturnType<typeof normalizeProgressAndPages> {
    return normalizeProgressAndPages(
        pagesTotal,
        toOptionalInt(book.pages_read),
        normalizedProgressRaw(book),
    );
}

function normalizedBookState(book: BookInput): NormalizedBookState {
    const TOTALS = normalizedTotals(book);
    const NORMALIZED = normalizedProgressState(book, TOTALS.pagesTotal);
    return {
        normalized: NORMALIZED,
        pagesTotal: TOTALS.pagesTotal,
        status: statusFromRaw(book.status, NORMALIZED.progress),
        wordsTotal: TOTALS.wordsTotal,
    };
}

function normalizedTextFields(
    book: BookInput,
    status: BookStatus,
): Partial<Book> {
    return {
        author: toTrimmedText(book.author),
        blocked_by: withNullableString(toTrimmedText(book.blocked_by)),
        book_id: toBookId(book.book_id),
        cover_local_path: toTrimmedText(book.cover_local_path),
        cover_url: toTrimmedText(book.cover_url),
        deadline: toOptionalDate(book.deadline),
        finished_at: finishedAtForStatus(status, book.finished_at),
        lookup_note: toTrimmedText(book.lookup_note),
        shelf: normalizeShelfName(book.shelf),
        status,
        title: toTrimmedText(book.title),
    };
}

function normalizedPreferenceFields(book: BookInput): Partial<Book> {
    return {
        difficulty: toClampedInt({
            fallback: DEFAULT_DIFFICULTY,
            maxValue: MAX_DIFFICULTY,
            minValue: MIN_DIFFICULTY,
            value: book.difficulty,
        }),
        priority: toClampedInt({
            fallback: DEFAULT_PRIORITY,
            maxValue: MAX_PRIORITY,
            minValue: MIN_PRIORITY,
            value: book.priority,
        }),
    };
}

function normalizedNumericMetrics(
    book: BookInput,
    state: NormalizedBookState,
): Partial<Book> {
    return {
        ...normalizedPreferenceFields(book),
        min_blocks_per_session: minBlocksPerSession(
            book.min_blocks_per_session,
        ),
        pages_read: state.normalized.pagesRead,
        pages_total: state.pagesTotal,
        progress_percent: state.normalized.progress,
        words_total: state.wordsTotal,
    };
}

function normalizedScheduleFields(book: BookInput): Partial<Book> {
    return {
        max_minutes_per_day: toOptionalInt(book.max_minutes_per_day),
        scheduled_days: normalizeScheduledDays(book.scheduled_days),
    };
}

/**
 * Normalizes raw/partial book input into canonical book model shape.
 * @param book - Partial book input from storage, form, or IPC payload.
 * @returns Normalized book with clamped numeric fields and consistent status data.
 */
export function normalizeBook(book: BookInput = {}): Book {
    const NORMALIZED_STATE = normalizedBookState(book);
    return {
        ...normalizedTextFields(book, NORMALIZED_STATE.status),
        ...normalizedNumericMetrics(book, NORMALIZED_STATE),
        ...normalizedScheduleFields(book),
    } as Book;
}

/**
 * Resolves preferred cover source path for rendering.
 * @param book - Book-like input containing cover fields.
 * @returns Local cover path when available, otherwise remote URL or empty string.
 */
export function bookCoverSrc(book: BookInput): string {
    return book.cover_local_path ?? book.cover_url ?? "";
}
