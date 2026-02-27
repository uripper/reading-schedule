import type { Book } from "../../../renderer/books/types.js";
import type { CalendarRowWithFinish } from "../../../renderer/calendar/data.js";

export interface ScheduleRow {
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
