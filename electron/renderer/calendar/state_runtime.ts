import type {
  CalendarHandlers,
  CalendarRuntimeState,
} from "../../types/types.js";

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
    isSessionCompleted:
      handlers.isSessionCompleted ?? defaults.isSessionCompleted,
    onSessionCompletionChanged:
      handlers.onSessionCompletionChanged ??
      defaults.onSessionCompletionChanged,
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
