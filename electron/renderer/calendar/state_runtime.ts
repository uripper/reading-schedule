import type { PlannerScheduleRow } from "../../types/types.js";
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

/**
 * Creates default mutable runtime state for calendar renderer.
 * @returns Fresh calendar runtime state object.
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
 * Returns no-op/default calendar handler implementations.
 * @returns Handler object safe for unbound calendar usage.
 */
export function defaultCalendarHandlers(): CalendarHandlers {
  return {
    isSessionCompleted: () => false,
    onSessionCompletionChanged: (payload): void => {
      Boolean(payload.completed);
    },
    onSessionProgressUpdated: () => null,
    onSessionMinutesUpdated: () => false,
    getBookById: () => null,
    listSessionBooks: () => [],
    onManualSessionAdded: () => false,
    onSessionRemoved: () => false,
  };
}

/**
 * Merges partial handler overrides over default calendar handlers.
 * @param handlers User-provided handler overrides.
 * @returns Fully populated handlers object.
 */
export function mergeCalendarHandlers(
  handlers: Partial<CalendarHandlers>,
): CalendarHandlers {
  const defaults = defaultCalendarHandlers();
  return {
    isSessionCompleted: handlers.isSessionCompleted ?? defaults.isSessionCompleted,
    onSessionCompletionChanged:
      handlers.onSessionCompletionChanged ?? defaults.onSessionCompletionChanged,
    onSessionProgressUpdated:
      handlers.onSessionProgressUpdated ?? defaults.onSessionProgressUpdated,
    onSessionMinutesUpdated:
      handlers.onSessionMinutesUpdated ?? defaults.onSessionMinutesUpdated,
    getBookById: handlers.getBookById ?? defaults.getBookById,
    listSessionBooks: handlers.listSessionBooks ?? defaults.listSessionBooks,
    onManualSessionAdded:
      handlers.onManualSessionAdded ?? defaults.onManualSessionAdded,
    onSessionRemoved: handlers.onSessionRemoved ?? defaults.onSessionRemoved,
  };
}
