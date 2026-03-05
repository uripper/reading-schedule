import type {
    Book,
    BookProgressUpdates,
    PagesUpdateResult,
    PercentUpdateContext,
    ProgressTotals,
} from "../../types/types.js";
import { clamp } from "./utils.js";

/**
 * Parses numeric-like input and rejects blank/non-finite values.
 * @param raw - Raw value from progress update payload.
 * @returns Finite number or `null` when input is invalid.
 */
function parseFiniteNumber(raw?: string | number): number | null {
    if (raw === undefined || raw === "") {
        return null;
    }
    const VALUE = Number(raw);
    if (!Number.isFinite(VALUE)) {
        return null;
    }
    return VALUE;
}

/**
 * Applies pages-read update to a mutable book copy.
 * @param book - Book copy being updated.
 * @param pagesUpdate - Parsed pages-read update value.
 * @param totals - Total-page context used for clamping.
 * @returns Updated book and whether pages-read changed.
 */
function applyPagesUpdate(
    book: Book,
    pagesUpdate: number | null,
    totals: ProgressTotals,
): PagesUpdateResult {
    if (pagesUpdate === null) {
        return { book, hasPagesUpdate: false };
    }
    const PAGES_READ = Math.round(pagesUpdate);
    if (!totals.hasPagesTotal) {
        return {
            book: { ...book, pages_read: Math.max(0, PAGES_READ) },
            hasPagesUpdate: true,
        };
    }
    return {
        book: { ...book, pages_read: clamp(PAGES_READ, 0, totals.pagesTotal) },
        hasPagesUpdate: true,
    };
}

/**
 * Applies explicit percent update when pages-read was not directly edited.
 * @param book - Book copy being updated.
 * @param pctUpdate - Parsed progress-percent update value.
 * @param context - Progress update context.
 * @returns Updated book with percent and inferred pages when applicable.
 */
function applyPercentUpdate(
    book: Book,
    pctUpdate: number | null,
    context: PercentUpdateContext,
): Book {
    if (pctUpdate === null || context.hasPagesUpdate) {
        return book;
    }
    const PROGRESS_PERCENT = Math.round(clamp(pctUpdate, 0, 100) * 10) / 10;
    if (!context.hasPagesTotal) {
        return { ...book, progress_percent: PROGRESS_PERCENT };
    }
    const PAGES_READ = Math.round(
        (PROGRESS_PERCENT / 100) * context.pagesTotal,
    );
    return {
        ...book,
        pages_read: PAGES_READ,
        progress_percent: PROGRESS_PERCENT,
    };
}

/**
 * Recomputes progress percent from pages-read when total pages is known.
 * @param book - Book copy being updated.
 * @param totals - Total-page context used for percent calculation.
 * @returns Updated book with recomputed progress percent.
 */
function reconcilePercentFromPages(book: Book, totals: ProgressTotals): Book {
    if (!totals.hasPagesTotal) {
        return book;
    }
    if (book.pages_read === null) {
        return book;
    }
    const PCT = (book.pages_read / totals.pagesTotal) * 100;
    const PROGRESS_PERCENT = Math.round(clamp(PCT, 0, 100) * 10) / 10;
    return { ...book, progress_percent: PROGRESS_PERCENT };
}

/**
 * Applies progress-related updates and keeps page/percent fields consistent.
 * @param book - Source book to update.
 * @param updates - Partial progress update payload.
 * @returns Updated book copy with reconciled progress values.
 */
export function withUpdatedProgress(
    book: Book,
    updates: BookProgressUpdates = {},
): Book {
    let nextBook = { ...book };
    const PAGES_TOTAL = Number(nextBook.pages_total ?? 0);
    const TOTALS: ProgressTotals = {
        hasPagesTotal: Number.isFinite(PAGES_TOTAL) && PAGES_TOTAL > 0,
        pagesTotal: PAGES_TOTAL,
    };
    const PAGES_UPDATE = parseFiniteNumber(updates.pagesRead ?? undefined);
    const PAGES_UPDATE_RESULT = applyPagesUpdate(
        nextBook,
        PAGES_UPDATE,
        TOTALS,
    );
    nextBook = PAGES_UPDATE_RESULT.book;
    const PCT_UPDATE = parseFiniteNumber(updates.progressPercent ?? undefined);
    nextBook = applyPercentUpdate(nextBook, PCT_UPDATE, {
        hasPagesTotal: TOTALS.hasPagesTotal,
        hasPagesUpdate: PAGES_UPDATE_RESULT.hasPagesUpdate,
        pagesTotal: TOTALS.pagesTotal,
    });
    nextBook = reconcilePercentFromPages(nextBook, TOTALS);
    return nextBook;
}
