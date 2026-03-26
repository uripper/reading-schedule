import type {
    AddManualSessionArgs,
    AppCalendarInteractionArgs,
    RemoveSessionArgs,
    ScheduleMutationHandlers,
    SharedScheduleBindings,
    UpdateSessionMinutesArgs,
} from "../../../types/types.ts";
import {
    addManualSessionRow,
    removeSessionRow,
    updateSessionRowMinutes,
} from "./calendar_interactions_schedule_updates.ts";

const NO_OP = (): void => {
    // Intentionally empty fallback callback.
};

function createSharedScheduleBindings(
    args: AppCalendarInteractionArgs,
): SharedScheduleBindings {
    return {
        applyStateMutation: args.applyStateMutation,
        collectSettings: args.collectSettings,
        getBookById: args.getBookById,
        onScheduleRowsUpdated: args.onScheduleRowsUpdated ?? NO_OP,
        queuePersist: args.queuePersist,
        renderCalendar: args.renderCalendar,
        setBookScheduleRows: args.setBookScheduleRows,
        setLastResult: args.setLastResult,
        setStatus: args.setStatus,
        state: args.state,
        totalsFromSummary: args.totalsFromSummary,
    };
}

function sharedUpdateArgs(
    bindings: SharedScheduleBindings,
): Omit<
    AddManualSessionArgs,
    | "bookId"
    | "collectSettings"
    | "completed"
    | "date"
    | "getBookById"
    | "minutes"
> {
    return {
        applyStateMutation: bindings.applyStateMutation,
        onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
        queuePersist: bindings.queuePersist,
        renderCalendar: bindings.renderCalendar,
        setBookScheduleRows: bindings.setBookScheduleRows,
        setLastResult: bindings.setLastResult,
        setStatus: bindings.setStatus,
        state: bindings.state,
        totalsFromSummary: bindings.totalsFromSummary,
    };
}

function manualSessionArgs(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onManualSessionAdded"]>[0],
): AddManualSessionArgs {
    return {
        ...sharedUpdateArgs(bindings),
        bookId: payload.bookId,
        collectSettings: bindings.collectSettings,
        completed: payload.completed,
        date: payload.date,
        getBookById: bindings.getBookById,
        minutes: payload.minutes,
    };
}

function updateSessionMinutesArgs(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onSessionMinutesUpdated"]>[0],
): UpdateSessionMinutesArgs {
    return {
        ...sharedUpdateArgs(bindings),
        collectSettings: bindings.collectSettings,
        getBookById: bindings.getBookById,
        minutes: payload.minutes,
        row: payload.row,
    };
}

function removeSessionArgs(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onSessionRemoved"]>[0],
): RemoveSessionArgs {
    return {
        ...sharedUpdateArgs(bindings),
        row: payload.row,
    };
}

function handleManualSessionAdded(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onManualSessionAdded"]>[0],
): ReturnType<ScheduleMutationHandlers["onManualSessionAdded"]> {
    return addManualSessionRow(manualSessionArgs(bindings, payload));
}

function handleSessionMinutesUpdated(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onSessionMinutesUpdated"]>[0],
): ReturnType<ScheduleMutationHandlers["onSessionMinutesUpdated"]> {
    return updateSessionRowMinutes(updateSessionMinutesArgs(bindings, payload));
}

function handleSessionRemoved(
    bindings: SharedScheduleBindings,
    payload: Parameters<ScheduleMutationHandlers["onSessionRemoved"]>[0],
): ReturnType<ScheduleMutationHandlers["onSessionRemoved"]> {
    return removeSessionRow(removeSessionArgs(bindings, payload));
}

function bindScheduleHandler<Args, Result>(
    bindings: SharedScheduleBindings,
    handler: (bindings: SharedScheduleBindings, payload: Args) => Result,
): (payload: Args) => Result {
    return handler.bind(undefined, bindings) as (payload: Args) => Result;
}

/**
 * Create SharedScheduleBindings from AppCalendarInteractionArgs by wrapping the provided callbacks and state for schedule handlers.
 * @example
 * createScheduleBindings(args)
 * { applyStateMutation: Function, collectSettings: Function, getBookById: Function, onScheduleRowsUpdated: Function, queuePersist: Function, renderCalendar: Function, setBookScheduleRows: Function, setLastResult: Function, setStatus: Function, state: Object, totalsFromSummary: Function }
 * @param {AppCalendarInteractionArgs} args - The AppCalendarInteractionArgs containing callbacks and state to wrap.
 * @returns {SharedScheduleBindings} Return an object exposing wrapped schedule-related functions and the shared state.
 */
export const BUILD_SCHEDULE_MUTATION_HANDLERS = (
    args: AppCalendarInteractionArgs,
): ScheduleMutationHandlers => {
    const BINDINGS = createSharedScheduleBindings(args);
    return {
        onManualSessionAdded: bindScheduleHandler(
            BINDINGS,
            handleManualSessionAdded,
        ),
        onSessionMinutesUpdated: bindScheduleHandler(
            BINDINGS,
            handleSessionMinutesUpdated,
        ),
        onSessionRemoved: bindScheduleHandler(BINDINGS, handleSessionRemoved),
    };
};
