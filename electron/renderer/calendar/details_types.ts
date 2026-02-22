import type { Book } from "../books/types.js";
import type { CalendarRowWithFinish } from "./data.js";

export type DayMode = "past" | "today" | "future";

interface CompletionPayload {
  completed: boolean;
  row: CalendarRowWithFinish;
  sessionKey: string;
}

interface ProgressPayload {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row: CalendarRowWithFinish;
}

interface MinutesPayload {
  minutes: number;
  row: CalendarRowWithFinish;
}

export interface ManualSessionBook {
  bookId: string;
  title: string;
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
