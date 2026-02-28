import {
    type CalendarHandlers,
    type CalendarRuntimeState,
} from "../../types/types.js";

/**
 * Creates default mutable runtime state for calendar renderer.
 * @returns Fresh calendar runtime state object.
 */
export function createCalendarRuntimeState(): CalendarRuntimeState {
    return {
        dates: {},
        expectedFinishHighlightDate: "",
        index: 0,
        monthCellKeys: [],
        months: [],
        rawRows: [],
        rows: [],
        selectedDate: "",
        totalsByBookId: {},
    };
}

/**
 * Returns no-op/default calendar handler implementations.
 * @returns Handler object safe for unbound calendar usage.
 */
export function defaultCalendarHandlers(): CalendarHandlers {
    return {
        getBookById: () => null,
        isSessionCompleted: () => false,
        listSessionBooks: () => [],
        onManualSessionAdded: () => false,
        onSessionCompletionChanged: (payload): void => {
            Boolean(payload.completed);
        },
        onSessionMinutesUpdated: () => false,
        onSessionProgressUpdated: () => null,
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
        getBookById: handlers.getBookById ?? defaults.getBookById,
        isSessionCompleted:
            handlers.isSessionCompleted ?? defaults.isSessionCompleted,
        listSessionBooks:
            handlers.listSessionBooks ?? defaults.listSessionBooks,
        onManualSessionAdded:
            handlers.onManualSessionAdded ?? defaults.onManualSessionAdded,
        onSessionCompletionChanged:
            handlers.onSessionCompletionChanged ??
            defaults.onSessionCompletionChanged,
        onSessionMinutesUpdated:
            handlers.onSessionMinutesUpdated ??
            defaults.onSessionMinutesUpdated,
        onSessionProgressUpdated:
            handlers.onSessionProgressUpdated ??
            defaults.onSessionProgressUpdated,
        onSessionRemoved:
            handlers.onSessionRemoved ?? defaults.onSessionRemoved,
    };
}
