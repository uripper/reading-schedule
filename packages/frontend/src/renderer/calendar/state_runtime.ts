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

function resolvedHandler<T>(override: T | undefined, fallback: T): T {
    if (override !== undefined) {
        return override;
    }
    return fallback;
}

function resolvedCalendarHandlers(
    handlers: Partial<CalendarHandlers>,
    defaults: CalendarHandlers,
): CalendarHandlers {
    const PRIMARY_HANDLERS = resolvedPrimaryHandlers(handlers, defaults);
    const UPDATE_HANDLERS = resolvedUpdateHandlers(handlers, defaults);
    return {
        ...PRIMARY_HANDLERS,
        ...UPDATE_HANDLERS,
    };
}

function resolvedPrimaryHandlers(
    handlers: Partial<CalendarHandlers>,
    defaults: CalendarHandlers,
) {
    return {
        getBookById: resolvedHandler(
            handlers.getBookById,
            defaults.getBookById,
        ),
        isSessionCompleted: resolvedHandler(
            handlers.isSessionCompleted,
            defaults.isSessionCompleted,
        ),
        listSessionBooks: resolvedHandler(
            handlers.listSessionBooks,
            defaults.listSessionBooks,
        ),
        onManualSessionAdded: resolvedHandler(
            handlers.onManualSessionAdded,
            defaults.onManualSessionAdded,
        ),
    };
}

function resolvedUpdateHandlers(
    handlers: Partial<CalendarHandlers>,
    defaults: CalendarHandlers,
) {
    return {
        onSessionCompletionChanged: resolvedHandler(
            handlers.onSessionCompletionChanged,
            defaults.onSessionCompletionChanged,
        ),
        onSessionMinutesUpdated: resolvedHandler(
            handlers.onSessionMinutesUpdated,
            defaults.onSessionMinutesUpdated,
        ),
        onSessionProgressUpdated: resolvedHandler(
            handlers.onSessionProgressUpdated,
            defaults.onSessionProgressUpdated,
        ),
        onSessionRemoved: resolvedHandler(
            handlers.onSessionRemoved,
            defaults.onSessionRemoved,
        ),
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
    return resolvedCalendarHandlers(handlers, defaultCalendarHandlers());
}
