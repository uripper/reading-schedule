import type { Book } from "./types_books.js";
import type { PlannerScheduleRow } from "./types_planner.js";
import type { ManualSessionBook } from "./types_calendar.js";
import type { CalendarRowWithFinish } from "./types_calendar.js";
export type { ManualSessionBook };

export interface CompletionChangePayload {
  sessionKey: string;
  completed: boolean;
  row: CalendarRowWithFinish;
}

export interface ProgressUpdatePayload {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
}

export interface MinutesUpdatePayload {
  minutes: number;
  row: CalendarRowWithFinish;
}

export interface ManualSessionPayload {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface RemoveSessionPayload {
  row: CalendarRowWithFinish;
}

export interface CalendarHandlers {
  isSessionCompleted(this: void, sessionKey: string): boolean;
  onSessionCompletionChanged(this: void, payload: CompletionChangePayload): void;
  onSessionProgressUpdated(this: void, payload: ProgressUpdatePayload): Book | null;
  onSessionMinutesUpdated(this: void, payload: MinutesUpdatePayload): boolean;
  getBookById(this: void, bookId: string): Book | null;
  listSessionBooks(this: void): ManualSessionBook[];
  onManualSessionAdded(this: void, payload: ManualSessionPayload): boolean;
  onSessionRemoved(this: void, payload: RemoveSessionPayload): boolean;
}

export interface CalendarRuntimeState {
  dates: Record<string, CalendarRowWithFinish[]>;
  rawRows: PlannerScheduleRow[];
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
  expectedFinishHighlightDate: string;
}
