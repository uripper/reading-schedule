import type {
    Book,
    PlannerResult,
    PlannerScheduleRow,
} from "../../../types/types.ts";
import { estimateSnapshotForRow } from "../../calendar/estimates_snapshot.ts";
import { totalsFromSummary } from "../runtime_helpers.ts";
import type {
    TodayCarouselActiveItem,
    TodayCarouselBookItem,
    TodayCarouselSessionItem,
} from "./today-carousel-model-types.ts";

const EMPTY_TEXT = "";
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

function normalizedBookId(value: unknown): string {
    return String(value || EMPTY_TEXT).trim();
}

function clampProgress(progressRaw: number): number {
    const VALUE = Number(progressRaw || MIN_PROGRESS);
    if (!Number.isFinite(VALUE)) {
        return MIN_PROGRESS;
    }
    if (VALUE < MIN_PROGRESS) {
        return MIN_PROGRESS;
    }
    if (VALUE > MAX_PROGRESS) {
        return MAX_PROGRESS;
    }
    return VALUE;
}

function normalizedPages(value: number | null | undefined): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
    }
    if (value < MIN_PROGRESS) {
        return MIN_PROGRESS;
    }
    return Math.round(value);
}

function booksById(books: Book[]): Map<string, Book> {
    const BY_ID = new Map<string, Book>();
    for (const BOOK of books) {
        const BOOK_ID = normalizedBookId(BOOK.book_id);
        if (BOOK_ID === EMPTY_TEXT) {
            continue;
        }
        BY_ID.set(BOOK_ID, BOOK);
    }
    return BY_ID;
}

function resolvedPagesRead(
    book: Book | undefined,
    pagesTotal: number | null,
): number | null {
    const PAGES_READ = normalizedPages(book?.pages_read);
    if (PAGES_READ !== null) {
        return PAGES_READ;
    }
    if (pagesTotal === null) {
        return null;
    }
    return Math.round(
        (clampProgress(Number(book?.progress_percent ?? 0)) / 100) * pagesTotal,
    );
}

function selectedCarouselBook(options: {
    books: TodayCarouselBookItem[];
    selectedBookId: string;
}): TodayCarouselBookItem | undefined {
    return options.books.find(
        (entry) => entry.bookId === options.selectedBookId,
    );
}

function scheduleRows(lastResult: PlannerResult | null): PlannerScheduleRow[] {
    if (!Array.isArray(lastResult?.schedule)) {
        return [];
    }
    return lastResult.schedule;
}

function isEstimatedSessionCompleted(
    scheduleCompletions: Record<string, boolean>,
    sessionKey: string,
): boolean {
    if (scheduleCompletions[sessionKey]) {
        return true;
    }
    const PARTS = sessionKey.split("|");
    if (PARTS.length !== 3) {
        return false;
    }
    return Boolean(scheduleCompletions[`${PARTS[0]}|${PARTS[2]}`]);
}

function activeEstimate(options: {
    activeRow: TodayCarouselSessionItem;
    bookById: Map<string, Book>;
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
}) {
    return estimateSnapshotForRow(
        options.activeRow.row,
        {
            rows: scheduleRows(options.lastResult),
            totalsByBookId: totalsFromSummary(
                options.lastResult?.summary ?? null,
            ),
        },
        (bookId) => options.bookById.get(bookId) ?? null,
        (sessionKey) =>
            isEstimatedSessionCompleted(
                options.scheduleCompletions,
                sessionKey,
            ),
    );
}

function activeBookProgress(book: Book | undefined): {
    pagesRead: number | null;
    pagesTotal: number | null;
    progressPercent: number;
} {
    const PAGES_TOTAL = normalizedPages(book?.pages_total);
    const PROGRESS = clampProgress(Number(book?.progress_percent ?? 0));
    return {
        pagesRead: resolvedPagesRead(book, PAGES_TOTAL),
        pagesTotal: PAGES_TOTAL,
        progressPercent: PROGRESS,
    };
}

function activeItemResult(options: {
    activeRow: TodayCarouselSessionItem;
    book: TodayCarouselBookItem;
    bookById: Map<string, Book>;
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
}): TodayCarouselActiveItem {
    const SOURCE_BOOK = options.bookById.get(options.book.bookId);
    const PROGRESS = activeBookProgress(SOURCE_BOOK);
    const ESTIMATE = activeEstimate({
        activeRow: options.activeRow,
        bookById: options.bookById,
        lastResult: options.lastResult,
        scheduleCompletions: options.scheduleCompletions,
    });
    return {
        afterPagesRead: ESTIMATE?.endPages ?? null,
        afterPercent: ESTIMATE?.endPercent ?? PROGRESS.progressPercent,
        book: options.book,
        pagesRead: PROGRESS.pagesRead,
        pagesTotal: PROGRESS.pagesTotal,
        progressPercent: PROGRESS.progressPercent,
        row: options.activeRow,
    };
}

export function buildTodayCarouselActiveItem(options: {
    books: Book[];
    carouselBooks: TodayCarouselBookItem[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    selectedBookId: string;
}): TodayCarouselActiveItem | null {
    const BOOK = selectedCarouselBook({
        books: options.carouselBooks,
        selectedBookId: options.selectedBookId,
    });
    if (BOOK === undefined) {
        return null;
    }
    return activeItemResult({
        activeRow: BOOK.targetRow,
        book: BOOK,
        bookById: booksById(options.books),
        lastResult: options.lastResult,
        scheduleCompletions: options.scheduleCompletions,
    });
}
