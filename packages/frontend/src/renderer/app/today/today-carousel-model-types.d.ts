import type { CalendarRowWithFinish } from "../../../types/types.ts";

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
