import type { UUID } from "node:crypto";

export type BookStatusFilter = "all" | BookStatus;

export type SortBy =
    | "title"
    | "author"
    | "pages_total"
    | "pages_read"
    | "words_total"
    | "progress_percent"
    | "priority"
    | "difficulty"
    | "deadline"
    | "estimated_finish"
    | "shelf";

export type SortDirection = "asc" | "desc";

export type OptionalNumber = number | null | undefined;

export type OptionalString = string | null | undefined;

export type BookInput = Partial<Book>;

export type BookStatus = "to_read" | "in_progress" | "read" | "dropped";

export interface Book {
    author: string;
    blocked_by: string | null;
    book_id: UUID | string;
    cover_local_path: string;
    cover_url: string;
    deadline: string | null;
    difficulty: number;
    finished_at: string | null;
    lookup_note: string;
    max_minutes_per_day: number | null;
    min_blocks_per_session: number;
    pages_read: number | null;
    pages_total: number | null;
    priority: number;
    progress_percent: number;
    remaining_words?: number | null;
    scheduled_days: string[];
    shelf: string;
    status: BookStatus;
    title: string;
    words_total: number | null;
}

export interface BookProgressUpdates {
    pagesRead?: number | null;
    progressPercent?: number | null;
    remainingWords?: number | null;
}

export interface BookMetaOptions {
    finishDateByBookId?: Record<string, string>;
    showBlockerMeta?: boolean;
    showShelfMeta?: boolean;
    showWordCount?: boolean;
    titleById?: Record<string, string>;
}

export interface ProgressTotals {
    hasPagesTotal: boolean;
    pagesTotal: number;
}

export interface PercentUpdateContext extends ProgressTotals {
    hasPagesUpdate: boolean;
}

export interface PagesUpdateResult {
    book: Book;
    hasPagesUpdate: boolean;
}

export interface GroupMeta {
    key: string;
    label: string;
    order: number;
    tie: string;
}

export type BookGroupBy =
    | "none"
    | "shelf"
    | "finish_date"
    | "title_letter"
    | "author";

export type GroupBucket = GroupMeta & {
    books: Book[];
};

export interface BookGroup {
    books: Book[];
    key: string;
    label: string;
}

export interface BlockerMeta {
    blockerBookId: string;
    label: string;
}

export type BookWeekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface UpdateBookProgressOptions {
    completedAt?: string;
    markStarted?: boolean;
    notifyBooksChanged?: boolean;
}
