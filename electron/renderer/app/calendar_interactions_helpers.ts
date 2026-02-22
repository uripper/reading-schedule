import type { Book } from "../books/types.js";
import type { CalendarRowWithFinish } from "../calendar/data.js";
import type { PlannerResult } from "./types.js";

interface ScheduleRow {
  title?: string;
  date?: string;
  book_id?: string;
}

export interface CompletionUpdate {
  sessionKey: string;
  completed: boolean;
  row?: ScheduleRow;
}

export interface ProgressUpdateInput {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row?: CalendarRowWithFinish;
}

export interface ManualSessionAddInput {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface RemoveSessionInput {
  row: CalendarRowWithFinish;
}

export interface MinutesUpdateInput {
  minutes: number;
  row: CalendarRowWithFinish;
}

export interface ManualSessionBook {
  bookId: string;
  title: string;
}

export type UpdatedBook = Book;

export {
  dayBookCompletionKey,
  dayBookCompletionKeyFromSession,
} from "./calendar_interactions_key_helpers.js";
export {
  DEFAULT_BOOK_DIFFICULTY,
  normalizedManualMinutes,
  wordsPlannedForManualSession,
} from "./calendar_interactions_manual_helpers.js";
export {
  nextSessionIndexForDate,
  rowsWithoutSession,
} from "./calendar_interactions_row_helpers.js";

export function emptyPlannerResult(): PlannerResult {
  return {
    schedule: [],
    summary: null,
    created_at: "",
  };
}

export function manualSessionBooks(books: Book[] = []): ManualSessionBook[] {
  return books
    .map((book) => ({
      bookId: String(book.book_id || ""),
      title: String(book.title || "").trim(),
    }))
    .filter((book) => book.bookId && book.title)
    .sort((left, right) => {
      return left.title.localeCompare(right.title, undefined, {
        sensitivity: "base",
      });
    });
}
