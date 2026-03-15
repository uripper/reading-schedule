import type {
    Book,
    PlannerResult,
    PlannerScheduleRow,
} from "../../../types/types.ts";
import { sortRowsByDateAndSession } from "../../calendar/utils.ts";
import { todayKey } from "../../sessions/utils.ts";
import { buildTodayCarouselActiveItem } from "./today-carousel-model-active.ts";
import { buildTodayCarouselBooks } from "./today-carousel-model-helpers.ts";
import type {
    TodayCarouselBookItem,
    TodayCarouselModel,
} from "./today-carousel-model-types.ts";

const EMPTY_TEXT = "";

export type {
    TodayCarouselActiveItem,
    TodayCarouselBookItem,
    TodayCarouselModel,
} from "./today-carousel-model-types.ts";

function todayRows(lastResult: PlannerResult | null): PlannerScheduleRow[] {
    let schedule: PlannerScheduleRow[] = [];
    if (Array.isArray(lastResult?.schedule)) {
        schedule = lastResult.schedule;
    }
    const SORTED = sortRowsByDateAndSession(schedule);
    const TODAY = todayKey();
    return SORTED.filter((row) => String(row.date || EMPTY_TEXT) === TODAY);
}

function hasSelectedBook(
    books: TodayCarouselBookItem[],
    selectedBookId: string,
): boolean {
    return books.some((book) => book.bookId === selectedBookId);
}

function defaultSelectedBookId(books: TodayCarouselBookItem[]): string {
    return books[0]?.bookId ?? EMPTY_TEXT;
}

function normalizedSelection(
    selectedBookIdRaw: string,
    books: TodayCarouselBookItem[],
): string {
    const SELECTED = String(selectedBookIdRaw || EMPTY_TEXT).trim();
    const DEFAULT_SELECTED_BOOK_ID = defaultSelectedBookId(books);
    if (SELECTED === EMPTY_TEXT) {
        return DEFAULT_SELECTED_BOOK_ID;
    }
    if (hasSelectedBook(books, SELECTED)) {
        return SELECTED;
    }
    return DEFAULT_SELECTED_BOOK_ID;
}

function todayCarouselModelState(options: {
    books: Book[];
    carouselBooks: TodayCarouselBookItem[];
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    selectedBookId: string;
}): TodayCarouselModel {
    return {
        active: buildTodayCarouselActiveItem(options),
        books: options.carouselBooks,
        selectedBookId: options.selectedBookId,
    };
}

export function buildTodayCarouselModel(options: {
    books: Book[];
    lastResult: PlannerResult | null;
    pinnedRowKeyByBookId: Record<string, string>;
    scheduleCompletions: Record<string, boolean>;
    selectedBookId: string;
}): TodayCarouselModel {
    const CAROUSEL_BOOKS = buildTodayCarouselBooks({
        books: options.books,
        pinnedRowKeyByBookId: options.pinnedRowKeyByBookId,
        scheduleCompletions: options.scheduleCompletions,
        todayScheduleRows: todayRows(options.lastResult),
    });
    return todayCarouselModelState({
        books: options.books,
        carouselBooks: CAROUSEL_BOOKS,
        lastResult: options.lastResult,
        scheduleCompletions: options.scheduleCompletions,
        selectedBookId: normalizedSelection(
            options.selectedBookId,
            CAROUSEL_BOOKS,
        ),
    });
}
