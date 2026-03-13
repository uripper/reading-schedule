import type {
    CalendarHandlers,
    CalendarRuntimeState,
} from "../../types/types.ts";

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
function defaultCalendarHandlers(): CalendarHandlers {
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
 * @param handlers - User-provided handler overrides.
 * @returns Fully populated handlers object.
 */
export function mergeCalendarHandlers(
    handlers: Partial<CalendarHandlers>,
): CalendarHandlers {
    const DEFAULTS = defaultCalendarHandlers();
    return {
        getBookById: handlers.getBookById ?? DEFAULTS.getBookById,
        isSessionCompleted:
            handlers.isSessionCompleted ?? DEFAULTS.isSessionCompleted,
        listSessionBooks:
            handlers.listSessionBooks ?? DEFAULTS.listSessionBooks,
        onManualSessionAdded:
            handlers.onManualSessionAdded ?? DEFAULTS.onManualSessionAdded,
        onSessionCompletionChanged:
            handlers.onSessionCompletionChanged ??
            DEFAULTS.onSessionCompletionChanged,
        onSessionMinutesUpdated:
            handlers.onSessionMinutesUpdated ??
            DEFAULTS.onSessionMinutesUpdated,
        onSessionProgressUpdated:
            handlers.onSessionProgressUpdated ??
            DEFAULTS.onSessionProgressUpdated,
        onSessionRemoved:
            handlers.onSessionRemoved ?? DEFAULTS.onSessionRemoved,
    };
}
