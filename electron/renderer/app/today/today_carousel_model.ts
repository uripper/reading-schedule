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
/**
 * Clamp a raw progress value to the inclusive range defined by MIN_PROGRESS and MAX_PROGRESS.
 * @example
 * clampProgress(1.5)
 * MAX_PROGRESS
 * @param {number} progressRaw - Raw progress value to clamp; if falsy or non-finite, MIN_PROGRESS is used.
 * @returns {number} A number within the inclusive range [MIN_PROGRESS, MAX_PROGRESS].
 **/
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
/**
 * Resolve the display title for a planner row: prefer book.title, then row.title, otherwise a default.
 * @example
 * resolveBookTitle({ title: 'Row Title' }, { title: 'Book Title' })
 * 'Book Title'
 * @param {{PlannerScheduleRow}} {{row}} - Planner schedule row object whose title may be used if the book title is absent.
 * @param {{Book | undefined}} {{book}} - Optional book object; its title is preferred when present and non-empty.
 * @returns {{string}} The chosen title: book title, row title, or DEFAULT_TITLE.
 **/
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
/**
 * Convert a planner schedule row and completion map into a TodayCarouselSessionItem.
 * @example
 * toSessionItem({ id: '1', minutes: 25, finish: 0 }, { 'session-1': true })
 * { completed: true, minutes: 25, row: { id: '1', minutes: 25, finish: false }, rowKey: 'session-1' }
 * @param {PlannerScheduleRow} row - Planner schedule row to convert.
 * @param {Record<string,boolean>} scheduleCompletions - Map of session keys to completion status.
 * @returns {TodayCarouselSessionItem} Today carousel session item derived from the row and completions.
 */
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
/**
 * Selects the target TodayCarouselSessionItem to display: the pinned session if present, otherwise the first incomplete session, otherwise the first session in the list.
 * @example
 * resolvedTargetRow({ pinnedRowKey: 'pin123', sessions: [{ id: 's1', status: 'complete' }, { id: 's2', status: 'incomplete' }] })
 * // returns { id: 's1', status: 'complete' } if 'pin123' matches s1, otherwise returns the first incomplete session object
 * @param {{ { pinnedRowKey: string; sessions: TodayCarouselSessionItem[] } }} {{options}} - Option bag containing the pinnedRowKey and the list of sessions.
 * @returns {{TodayCarouselSessionItem}} The chosen TodayCarouselSessionItem: pinned, first incomplete, or the first session as a fallback.
 **/
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
/**
 * Build a list of TodayCarouselBookItem objects grouped by book from today's schedule rows.
 * @example
 * buildBooks({
 *   books: [{ id: "book1", /* ... */
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
/**
 * Normalize the selected book id to a valid id present in the carousel or fall back to an appropriate default.
 * @example
 * normalizedSelection("book-1", [{ bookId: "book-1" }])
 * "book-1"
 * @param {{string}} {{selectedBookIdRaw}} - Raw selected book id that may be empty or contain only whitespace.
 * @param {{TodayCarouselBookItem[]}} {{books}} - Array of available carousel book items.
 * @returns {{string}} Return the normalized bookId: the provided valid id, the first book's id, or an EMPTY_TEXT constant when the list is empty.
 **/
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
/**
 * Resolve the number of pages read for a book using explicit pages_read or computed from progress percent and total pages.
 * @example
 * resolvedPagesRead({ pages_read: 42, progress_percent: 21 }, 200)
 * 42
 * @param {{Book|undefined}} {{book}} - Book object or undefined; may include pages_read and progress_percent fields.
 * @param {{number|null}} {{pagesTotal}} - Total number of pages in the book, or null if unknown.
 * @returns {{number|null}} Resolved pages read rounded to the nearest integer, or null if it cannot be determined.
 **/
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
/**
 * Get the active carousel item for the currently selected book, including estimated end pages/percent, pages read/total, and current progress.
 * @example
 * activeItem({ bookById: new Map(), books: [], lastResult: null, scheduleCompletions: {}, selectedBookId: 'book-id' })
 * { afterPagesRead: 120, afterPercent: 80, book: { bookId: 'book-id', targetRow: {...} }, pagesRead: 20, pagesTotal: 150, progressPercent: 80, row: {...} } || null
 * @param {{ {bookById: Map<string, Book>, books: TodayCarouselBookItem[], lastResult: PlannerResult|null, scheduleCompletions: Record<string, boolean>, selectedBookId: string} }} {{options}} - Options containing book lookup map, carousel items, last planner result, schedule completion flags, and the selected book id.
 * @returns {{TodayCarouselActiveItem | null}} The resolved active carousel item for the selected book, or null if no matching book is found.
 **/
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
/**
 * Build the Today carousel model from provided books, planner results, pinned rows, and selection.
 * @example
 * buildTodayCarouselModel({books: [{/* Book */
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
