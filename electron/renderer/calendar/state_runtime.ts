import type { PlannerScheduleRow } from "../app/types.js";
import type { Book } from "../books/types.js";
import type { CalendarRowWithFinish } from "./data.js";

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

export interface ManualSessionBook {
  bookId: string;
  title: string;
}

export interface CalendarHandlers {
  isSessionCompleted(sessionKey: string): boolean;
  onSessionCompletionChanged(payload: CompletionChangePayload): void;
  onSessionProgressUpdated(payload: ProgressUpdatePayload): Book | null;
  onSessionMinutesUpdated(payload: MinutesUpdatePayload): boolean;
  getBookById(bookId: string): Book | null;
  listSessionBooks(): ManualSessionBook[];
  onManualSessionAdded(payload: ManualSessionPayload): boolean;
  onSessionRemoved(payload: RemoveSessionPayload): boolean;
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

/**
 *
 */
export function createCalendarRuntimeState(): CalendarRuntimeState {
  return {
    dates: {},
    rawRows: [],
    rows: [],
    totalsByBookId: {},
    months: [],
    index: 0,
    selectedDate: "",
    monthCellKeys: [],
    expectedFinishHighlightDate: "",
  };
}

/**
 *
 */
export function defaultCalendarHandlers(): CalendarHandlers {
  return {
    isSessionCompleted: () => false,
    onSessionCompletionChanged: () => {},
    onSessionProgressUpdated: () => null,
    onSessionMinutesUpdated: () => false,
    getBookById: () => null,
    listSessionBooks: () => [],
    onManualSessionAdded: () => false,
    onSessionRemoved: () => false,
  };
}

/**
 *
 * @param handlers
 */
export function mergeCalendarHandlers(
  handlers: Partial<CalendarHandlers>,
): CalendarHandlers {
  const defaults = defaultCalendarHandlers();
  return {
    isSessionCompleted: handlers.isSessionCompleted || defaults.isSessionCompleted,
    onSessionCompletionChanged:
      handlers.onSessionCompletionChanged || defaults.onSessionCompletionChanged,
    onSessionProgressUpdated:
      handlers.onSessionProgressUpdated || defaults.onSessionProgressUpdated,
    onSessionMinutesUpdated:
      handlers.onSessionMinutesUpdated || defaults.onSessionMinutesUpdated,
    getBookById: handlers.getBookById || defaults.getBookById,
    listSessionBooks: handlers.listSessionBooks || defaults.listSessionBooks,
    onManualSessionAdded:
      handlers.onManualSessionAdded || defaults.onManualSessionAdded,
    onSessionRemoved: handlers.onSessionRemoved || defaults.onSessionRemoved,
  };
}
