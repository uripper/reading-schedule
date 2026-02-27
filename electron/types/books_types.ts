import type {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_FILTER_ALL,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
} from "../../renderer/books/status_catalog.js";
import type {
  GROUP_BY_AUTHOR,
  GROUP_BY_FINISH_DATE,
  GROUP_BY_NONE,
  GROUP_BY_SHELF,
  GROUP_BY_TITLE_LETTER,
} from "../../renderer/books/grouping.js";
import type {
  BOOK_WEEKDAYS,
} from "../../renderer/books/scheduled_days.js";
import type {
  SORT_BY_AUTHOR,
  SORT_BY_DEADLINE,
  SORT_BY_DIFFICULTY,
  SORT_BY_ESTIMATED_FINISH,
  SORT_BY_PAGES_READ,
  SORT_BY_PAGES_TOTAL,
  SORT_BY_PRIORITY,
  SORT_BY_PROGRESS,
  SORT_BY_SHELF,
  SORT_BY_TITLE,
  SORT_BY_WORDS_TOTAL,
  SORT_DIRECTION_ASC,
  SORT_DIRECTION_DESC,
} from "../../renderer/books/sort.js";

export type BookStatus =
  | typeof BOOK_STATUS_TO_READ
  | typeof BOOK_STATUS_IN_PROGRESS
  | typeof BOOK_STATUS_READ
  | typeof BOOK_STATUS_DROPPED;

export type BookStatusFilter = typeof BOOK_STATUS_FILTER_ALL | BookStatus;

export type SortBy =
  | typeof SORT_BY_TITLE
  | typeof SORT_BY_AUTHOR
  | typeof SORT_BY_PAGES_TOTAL
  | typeof SORT_BY_PAGES_READ
  | typeof SORT_BY_WORDS_TOTAL
  | typeof SORT_BY_PROGRESS
  | typeof SORT_BY_PRIORITY
  | typeof SORT_BY_DIFFICULTY
  | typeof SORT_BY_DEADLINE
  | typeof SORT_BY_ESTIMATED_FINISH
  | typeof SORT_BY_SHELF;

export type SortDirection =
  | typeof SORT_DIRECTION_ASC
  | typeof SORT_DIRECTION_DESC;

export type OptionalNumber = number | null | undefined;

export type OptionalString = string | null | undefined;

export interface Book {
  book_id: string;
  title: string;
  author: string;
  words_total: number | null;
  pages_total: number | null;
  pages_read: number | null;
  progress_percent: number;
  priority: number;
  difficulty: number;
  min_blocks_per_session: number;
  max_minutes_per_day: number | null;
  deadline: string | null;
  blocked_by: string | null;
  shelf: string;
  scheduled_days: string[];
  status: BookStatus;
  finished_at: string | null;
  cover_url: string;
  cover_local_path: string;
  lookup_note: string;
}

export type BookInput = Partial<Book>;

export interface BookProgressUpdates {
  pagesRead?: number | null;
  progressPercent?: number | null;
}

export interface BookMetaOptions {
  titleById?: Record<string, string>;
  finishDateByBookId?: Record<string, string>;
  showShelfMeta?: boolean;
  showBlockerMeta?: boolean;
  showWordCount?: boolean;
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
  | typeof GROUP_BY_NONE
  | typeof GROUP_BY_SHELF
  | typeof GROUP_BY_FINISH_DATE
  | typeof GROUP_BY_TITLE_LETTER
  | typeof GROUP_BY_AUTHOR;

export type GroupBucket = GroupMeta & {
  books: Book[];
};

export interface BookGroup {
  key: string;
  label: string;
  books: Book[];
}

export interface BlockerMeta {
  blockerBookId: string;
  label: string;
}

export type BookWeekday = (typeof BOOK_WEEKDAYS)[number];

export type SortComparator = (
  leftBook: Book,
  rightBook: Book,
  finishDateByBookId: Record<string, string>,
) => number;

export type { NumericLike } from "./core_primitives.js";

export type * from "./books_ui.js";
export type * from "./books_controller.js";
