import type {
    AppCalendarInteractionArgs,
    ScheduleMutationHandlers,
    SharedScheduleBindings,
} from "../../../types/types.js";
import {
    addManualSessionRow,
    removeSessionRow,
    updateSessionRowMinutes,
} from "./calendar_interactions_schedule_updates.js";

/**
 * Create SharedScheduleBindings from AppCalendarInteractionArgs by wrapping the provided callbacks and state for schedule handlers.
 * @example
 * createScheduleBindings(args)
 * { applyStateMutation: Function, collectSettings: Function, getBookById: Function, onScheduleRowsUpdated: Function, queuePersist: Function, renderCalendar: Function, setBookScheduleRows: Function, setLastResult: Function, setStatus: Function, state: Object, totalsFromSummary: Function }
 * @param {AppCalendarInteractionArgs} args - The AppCalendarInteractionArgs containing callbacks and state to wrap.
 * @returns {SharedScheduleBindings} Return an object exposing wrapped schedule-related functions and the shared state.
 */
const CREATE_SHARED_SCHEDULE_BINDINGS = (
    args: AppCalendarInteractionArgs,
): SharedScheduleBindings => {
    const ON_SCHEDULE_ROWS_UPDATED = (): void => {
        if (args.onScheduleRowsUpdated !== undefined) {
            args.onScheduleRowsUpdated();
        }
    };
    const COLLECT_SETTINGS = (): ReturnType<
        AppCalendarInteractionArgs["collectSettings"]
    > => {
        return args.collectSettings();
    };
    const GET_BOOK_BY_ID = (
        bookId: string,
    ): ReturnType<AppCalendarInteractionArgs["getBookById"]> => {
        return args.getBookById(bookId);
    };
    const QUEUE_PERSIST = (): void => {
        args.queuePersist();
    };
    const RENDER_CALENDAR = (
        rows: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[0],
        totals: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[1],
    ): void => {
        args.renderCalendar(rows, totals);
    };
    const SET_BOOK_SCHEDULE_ROWS = (
        rows: Parameters<AppCalendarInteractionArgs["setBookScheduleRows"]>[0],
    ): void => {
        args.setBookScheduleRows(rows);
    };
    const SET_LAST_RESULT = (
        result: Parameters<AppCalendarInteractionArgs["setLastResult"]>[0],
    ): void => {
        args.setLastResult(result);
    };
    const SET_STATUS = (message: string, isError = false): void => {
        args.setStatus(message, isError);
    };
    const TOTALS_FROM_SUMMARY = (
        summary: Parameters<AppCalendarInteractionArgs["totalsFromSummary"]>[0],
    ): ReturnType<AppCalendarInteractionArgs["totalsFromSummary"]> => {
        return args.totalsFromSummary(summary);
    };
    const APPLY_STATE_MUTATION = (
        mutation: Parameters<
            AppCalendarInteractionArgs["applyStateMutation"]
        >[0],
    ): void => {
        args.applyStateMutation(mutation);
    };
    return {
        applyStateMutation: APPLY_STATE_MUTATION,
        collectSettings: COLLECT_SETTINGS,
        getBookById: GET_BOOK_BY_ID,
        onScheduleRowsUpdated: ON_SCHEDULE_ROWS_UPDATED,
        queuePersist: QUEUE_PERSIST,
        renderCalendar: RENDER_CALENDAR,
        setBookScheduleRows: SET_BOOK_SCHEDULE_ROWS,
        setLastResult: SET_LAST_RESULT,
        setStatus: SET_STATUS,
        state: args.state,
        totalsFromSummary: TOTALS_FROM_SUMMARY,
    };
};

/**
 * Create schedule mutation handlers used by the calendar interaction layer.
 * @example
 * createScheduleMutationHandlers(args)
 * { onManualSessionAdded: Function, onSessionMinutesUpdated: Function, onSessionRemoved: Function }
 * @param {AppCalendarInteractionArgs} args - Configuration and dependencies required to create the schedule mutation handlers.
 * @returns {ScheduleMutationHandlers} Handlers for mutating schedule state (add, update, and remove session rows).
 */
export const BUILD_SCHEDULE_MUTATION_HANDLERS = (
    args: AppCalendarInteractionArgs,
): ScheduleMutationHandlers => {
    const BINDINGS = CREATE_SHARED_SCHEDULE_BINDINGS(args);
    return {
        onManualSessionAdded: ({
            date,
            bookId,
            minutes,
            completed = false,
        }) => {
            return addManualSessionRow({
                applyStateMutation: BINDINGS.applyStateMutation,
                bookId,
                collectSettings: BINDINGS.collectSettings,
                completed,
                date,
                getBookById: BINDINGS.getBookById,
                minutes,
                onScheduleRowsUpdated: BINDINGS.onScheduleRowsUpdated,
                queuePersist: BINDINGS.queuePersist,
                renderCalendar: BINDINGS.renderCalendar,
                setBookScheduleRows: BINDINGS.setBookScheduleRows,
                setLastResult: BINDINGS.setLastResult,
                setStatus: BINDINGS.setStatus,
                state: BINDINGS.state,
                totalsFromSummary: BINDINGS.totalsFromSummary,
            });
        },
        onSessionMinutesUpdated: ({ minutes, row }) => {
            return updateSessionRowMinutes({
                applyStateMutation: BINDINGS.applyStateMutation,
                collectSettings: BINDINGS.collectSettings,
                getBookById: BINDINGS.getBookById,
                minutes,
                onScheduleRowsUpdated: BINDINGS.onScheduleRowsUpdated,
                queuePersist: BINDINGS.queuePersist,
                renderCalendar: BINDINGS.renderCalendar,
                row,
                setBookScheduleRows: BINDINGS.setBookScheduleRows,
                setLastResult: BINDINGS.setLastResult,
                setStatus: BINDINGS.setStatus,
                state: BINDINGS.state,
                totalsFromSummary: BINDINGS.totalsFromSummary,
            });
        },
        onSessionRemoved: ({ row }) => {
            return removeSessionRow({
                applyStateMutation: BINDINGS.applyStateMutation,
                onScheduleRowsUpdated: BINDINGS.onScheduleRowsUpdated,
                queuePersist: BINDINGS.queuePersist,
                renderCalendar: BINDINGS.renderCalendar,
                row,
                setBookScheduleRows: BINDINGS.setBookScheduleRows,
                setLastResult: BINDINGS.setLastResult,
                setStatus: BINDINGS.setStatus,
                state: BINDINGS.state,
                totalsFromSummary: BINDINGS.totalsFromSummary,
            });
        },
    };
};
