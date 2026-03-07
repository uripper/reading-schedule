/**
 * Builds the Today carousel model from planner results and book metadata.
 */
import type {
    Book,
    CalendarRowWithFinish,
    PlannerResult,
    PlannerScheduleRow,
} from "../../../types/types.js";
import { bookCoverSrc } from "../../books/model.js";
import { estimateSnapshotForRow } from "../../calendar/estimates_snapshot.js";
import {
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.js";
import { todayKey } from "../../sessions/utils.js";
import { totalsFromSummary } from "../runtime_helpers.js";

const EMPTY_TEXT = "";
const DEFAULT_TITLE = "Untitled";
const UNKNOWN_AUTHOR = "Unknown Author";
const MIN_PROGRESS = 0;
const MAX_PROGRESS = 100;

// TODO: Split this file into focused selection, grouping, and projection
// helpers so the Today model stays under the 300-line STYLEGUIDE limit.
export interface TodayCarouselSessionItem {
    completed: boolean;
    minutes: number;
    row: CalendarRowWithFinish;
    rowKey: string;
}
export interface TodayCarouselBookItem {
    author: string;
    bookId: string;
    coverSrc: string;
    sessions: TodayCarouselSessionItem[];
    targetRow: TodayCarouselSessionItem;
    title: string;
}
export interface TodayCarouselActiveItem {
    afterPagesRead: number | null;
    afterPercent: number;
    book: TodayCarouselBookItem;
    pagesRead: number | null;
    pagesTotal: number | null;
    progressPercent: number;
    row: TodayCarouselSessionItem;
}
export interface TodayCarouselModel {
    active: TodayCarouselActiveItem | null;
    books: TodayCarouselBookItem[];
    selectedBookId: string;
}
function normalizedBookId(value: unknown): string {
    return String(value || "").trim();
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
function todayRows(lastResult: PlannerResult | null): PlannerScheduleRow[] {
    let schedule: PlannerScheduleRow[] = [];
    if (Array.isArray(lastResult?.schedule)) {
        schedule = lastResult.schedule;
    }
    const SORTED = sortRowsByDateAndSession(schedule);
    const TODAY = todayKey();
    return SORTED.filter((row) => String(row.date || "") === TODAY);
}
function isSessionCompleted(options: {
    row: PlannerScheduleRow;
    scheduleCompletions: Record<string, boolean>;
}): boolean {
    const SESSION_KEY = sessionKeyFor(options.row);
    if (options.scheduleCompletions[SESSION_KEY]) {
        return true;
    }
    const FALLBACK_KEY = `${options.row.date}|${options.row.book_id}`;
    return Boolean(options.scheduleCompletions[FALLBACK_KEY]);
}
function booksById(books: Book[]): Map<string, Book> {
    const BY_ID = new Map<string, Book>();
    for (const BOOK of books) {
        const BOOK_ID = normalizedBookId(BOOK.book_id);
        if (!BOOK_ID) {
            continue;
        }
        BY_ID.set(BOOK_ID, BOOK);
    }
    return BY_ID;
}
function resolveBookTitle(
    row: PlannerScheduleRow,
    book: Book | undefined,
): string {
    const FROM_BOOK = String(book?.title || "").trim();
    if (FROM_BOOK) {
        return FROM_BOOK;
    }
    const FROM_ROW = String(row.title || "").trim();
    if (FROM_ROW) {
        return FROM_ROW;
    }
    return DEFAULT_TITLE;
}
function resolveAuthor(book: Book | undefined): string {
    const AUTHOR = String(book?.author || "").trim();
    if (AUTHOR) {
        return AUTHOR;
    }
    return UNKNOWN_AUTHOR;
}
function toSessionItem(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
): TodayCarouselSessionItem {
    const ROW_WITH_FINISH: CalendarRowWithFinish = {
        ...row,
        finish: Boolean(row.finish),
    };
    return {
        completed: isSessionCompleted({ row, scheduleCompletions }),
        minutes: Math.max(1, Math.round(Number(row.minutes || 0))),
        row: ROW_WITH_FINISH,
        rowKey: sessionKeyFor(row),
    };
}
function firstIncompleteSession(
    sessions: TodayCarouselSessionItem[],
): TodayCarouselSessionItem | null {
    for (const SESSION of sessions) {
        if (!SESSION.completed) {
            return SESSION;
        }
    }
    return null;
}
function sessionByKey(
    sessions: TodayCarouselSessionItem[],
    rowKey: string,
): TodayCarouselSessionItem | null {
    for (const SESSION of sessions) {
        if (SESSION.rowKey === rowKey) {
            return SESSION;
        }
    }
    return null;
}
function resolvedTargetRow(options: {
    pinnedRowKey: string;
    sessions: TodayCarouselSessionItem[];
}): TodayCarouselSessionItem {
    const PINNED = sessionByKey(options.sessions, options.pinnedRowKey);
    if (PINNED !== null) {
        return PINNED;
    }
    const INCOMPLETE = firstIncompleteSession(options.sessions);
    if (INCOMPLETE !== null) {
        return INCOMPLETE;
    }
    return options.sessions[0];
}
function buildBooks(options: {
    books: Book[];
    pinnedRowKeyByBookId: Record<string, string>;
    scheduleCompletions: Record<string, boolean>;
    todayScheduleRows: PlannerScheduleRow[];
}): TodayCarouselBookItem[] {
    const BOOKS_BY_ID = booksById(options.books);
    const GROUPED = new Map<string, TodayCarouselSessionItem[]>();
    for (const ROW of options.todayScheduleRows) {
        const BOOK_ID = normalizedBookId(ROW.book_id);
        if (!BOOK_ID) {
            continue;
        }
        const EXISTING = GROUPED.get(BOOK_ID) ?? [];
        EXISTING.push(toSessionItem(ROW, options.scheduleCompletions));
        GROUPED.set(BOOK_ID, EXISTING);
    }
    const OUTPUT: TodayCarouselBookItem[] = [];
    for (const [BOOK_ID, SESSIONS] of GROUPED.entries()) {
        const BOOK = BOOKS_BY_ID.get(BOOK_ID);
        let coverSrc = EMPTY_TEXT;
        if (BOOK) {
            coverSrc = bookCoverSrc(BOOK);
        }
        OUTPUT.push({
            author: resolveAuthor(BOOK),
            bookId: BOOK_ID,
            coverSrc,
            sessions: SESSIONS,
            targetRow: resolvedTargetRow({
                pinnedRowKey:
                    options.pinnedRowKeyByBookId[BOOK_ID] ?? EMPTY_TEXT,
                sessions: SESSIONS,
            }),
            title: resolveBookTitle(SESSIONS[0].row, BOOK),
        });
    }
    OUTPUT.sort((left, right) => {
        return left.title.localeCompare(right.title, undefined, {
            sensitivity: "base",
        });
    });
    return OUTPUT;
}
function normalizedSelection(
    selectedBookIdRaw: string,
    books: TodayCarouselBookItem[],
): string {
    const SELECTED = String(selectedBookIdRaw || "").trim();
    if (SELECTED && books.some((book) => book.bookId === SELECTED)) {
        return SELECTED;
    }
    if (!books.length) {
        return EMPTY_TEXT;
    }
    return books[0].bookId;
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
function activeItem(options: {
    bookById: Map<string, Book>;
    books: TodayCarouselBookItem[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    selectedBookId: string;
}): TodayCarouselActiveItem | null {
    const BOOK = options.books.find(
        (entry) => entry.bookId === options.selectedBookId,
    );
    if (BOOK === undefined) {
        return null;
    }
    const ACTIVE_ROW = BOOK.targetRow;
    const SOURCE_BOOK = options.bookById.get(BOOK.bookId);
    const PAGES_TOTAL = normalizedPages(SOURCE_BOOK?.pages_total);
    const PROGRESS = clampProgress(Number(SOURCE_BOOK?.progress_percent ?? 0));
    let scheduleRows: PlannerScheduleRow[] = [];
    if (Array.isArray(options.lastResult?.schedule)) {
        scheduleRows = options.lastResult.schedule;
    }
    const ESTIMATE = estimateSnapshotForRow(
        ACTIVE_ROW.row,
        {
            rows: scheduleRows,
            totalsByBookId: totalsFromSummary(
                options.lastResult?.summary ?? null,
            ),
        },
        (bookId) => options.bookById.get(bookId) ?? null,
        (sessionKey) => {
            if (options.scheduleCompletions[sessionKey]) {
                return true;
            }
            const PARTS = sessionKey.split("|");
            if (PARTS.length !== 3) {
                return false;
            }
            return Boolean(
                options.scheduleCompletions[`${PARTS[0]}|${PARTS[2]}`],
            );
        },
    );
    return {
        afterPagesRead: ESTIMATE?.endPages ?? null,
        afterPercent: ESTIMATE?.endPercent ?? PROGRESS,
        book: BOOK,
        pagesRead: resolvedPagesRead(SOURCE_BOOK, PAGES_TOTAL),
        pagesTotal: PAGES_TOTAL,
        progressPercent: PROGRESS,
        row: ACTIVE_ROW,
    };
}
export function buildTodayCarouselModel(options: {
    books: Book[];
    lastResult: PlannerResult | null;
    pinnedRowKeyByBookId: Record<string, string>;
    scheduleCompletions: Record<string, boolean>;
    selectedBookId: string;
}): TodayCarouselModel {
    const TODAY_ROWS = todayRows(options.lastResult);
    const BOOKS = buildBooks({
        books: options.books,
        pinnedRowKeyByBookId: options.pinnedRowKeyByBookId,
        scheduleCompletions: options.scheduleCompletions,
        todayScheduleRows: TODAY_ROWS,
    });
    const BOOK_BY_ID = booksById(options.books);
    const SELECTED_BOOK_ID = normalizedSelection(options.selectedBookId, BOOKS);
    return {
        active: activeItem({
            bookById: BOOK_BY_ID,
            books: BOOKS,
            lastResult: options.lastResult,
            scheduleCompletions: options.scheduleCompletions,
            selectedBookId: SELECTED_BOOK_ID,
        }),
        books: BOOKS,
        selectedBookId: SELECTED_BOOK_ID,
    };
}
