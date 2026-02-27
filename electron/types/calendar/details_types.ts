import type { Book } from "../../renderer/books/types.js";
import type { CalendarRowWithFinish } from "../../renderer/calendar/data.js";
import type { ManualSessionBook } from "./details.js";
export type { ManualSessionBook };

export type DayMode = "past" | "today" | "future";

export interface CompletionPayload {
  completed: boolean;
  row: CalendarRowWithFinish;
  sessionKey: string;
}

export interface ProgressPayload {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row: CalendarRowWithFinish;
}

export interface MinutesPayload {
  minutes: number;
  row: CalendarRowWithFinish;
}

export interface ManualSessionAddPayload {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface DetailInteractionHandlers {
  isSessionCompleted(sessionKey: string): boolean;
  onSessionCompletionChanged(payload: CompletionPayload): void;
  onSessionProgressUpdated(payload: ProgressPayload): Book | null;
  onSessionMinutesUpdated(payload: MinutesPayload): boolean;
  getBookById(bookId: string): Book | null;
  listSessionBooks(): ManualSessionBook[];
  onManualSessionAdded(payload: ManualSessionAddPayload): boolean;
  onSessionRemoved(payload: { row: CalendarRowWithFinish }): boolean;
}

export interface CalendarStateSubset {
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
}
