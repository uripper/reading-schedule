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

const createSharedScheduleBindings = (
    args: AppCalendarInteractionArgs,
): SharedScheduleBindings => {
    const onScheduleRowsUpdated = (): void => {
        if (args.onScheduleRowsUpdated !== undefined) {
            args.onScheduleRowsUpdated();
        }
    };
    const collectSettings = (): ReturnType<
        AppCalendarInteractionArgs["collectSettings"]
    > => {
        return args.collectSettings();
    };
    const getBookById = (
        bookId: string,
    ): ReturnType<AppCalendarInteractionArgs["getBookById"]> => {
        return args.getBookById(bookId);
    };
    const queuePersist = (): void => {
        args.queuePersist();
    };
    const renderCalendar = (
        rows: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[0],
        totals: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[1],
    ): void => {
        args.renderCalendar(rows, totals);
    };
    const setBookScheduleRows = (
        rows: Parameters<AppCalendarInteractionArgs["setBookScheduleRows"]>[0],
    ): void => {
        args.setBookScheduleRows(rows);
    };
    const setLastResult = (
        result: Parameters<AppCalendarInteractionArgs["setLastResult"]>[0],
    ): void => {
        args.setLastResult(result);
    };
    const setStatus = (message: string, isError = false): void => {
        args.setStatus(message, isError);
    };
    const totalsFromSummary = (
        summary: Parameters<AppCalendarInteractionArgs["totalsFromSummary"]>[0],
    ): ReturnType<AppCalendarInteractionArgs["totalsFromSummary"]> => {
        return args.totalsFromSummary(summary);
    };
    const applyStateMutation = (
        mutation: Parameters<
            AppCalendarInteractionArgs["applyStateMutation"]
        >[0],
    ): void => {
        args.applyStateMutation(mutation);
    };
    return {
        applyStateMutation,
        collectSettings,
        getBookById,
        onScheduleRowsUpdated,
        queuePersist,
        renderCalendar,
        setBookScheduleRows,
        setLastResult,
        setStatus,
        totalsFromSummary,
        state: args.state,
    };
};

export const buildScheduleMutationHandlers = (
    args: AppCalendarInteractionArgs,
): ScheduleMutationHandlers => {
    const bindings = createSharedScheduleBindings(args);
    return {
        onManualSessionAdded: ({
            date,
            bookId,
            minutes,
            completed = false,
        }) => {
            return addManualSessionRow({
                bookId,
                completed,
                date,
                minutes,
                collectSettings: bindings.collectSettings,
                getBookById: bindings.getBookById,
                onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
                applyStateMutation: bindings.applyStateMutation,
                queuePersist: bindings.queuePersist,
                renderCalendar: bindings.renderCalendar,
                setBookScheduleRows: bindings.setBookScheduleRows,
                setLastResult: bindings.setLastResult,
                setStatus: bindings.setStatus,
                state: bindings.state,
                totalsFromSummary: bindings.totalsFromSummary,
            });
        },
        onSessionMinutesUpdated: ({ minutes, row }) => {
            return updateSessionRowMinutes({
                minutes,
                row,
                collectSettings: bindings.collectSettings,
                getBookById: bindings.getBookById,
                onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
                applyStateMutation: bindings.applyStateMutation,
                queuePersist: bindings.queuePersist,
                renderCalendar: bindings.renderCalendar,
                setBookScheduleRows: bindings.setBookScheduleRows,
                setLastResult: bindings.setLastResult,
                setStatus: bindings.setStatus,
                state: bindings.state,
                totalsFromSummary: bindings.totalsFromSummary,
            });
        },
        onSessionRemoved: ({ row }) => {
            return removeSessionRow({
                row,
                onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
                applyStateMutation: bindings.applyStateMutation,
                queuePersist: bindings.queuePersist,
                renderCalendar: bindings.renderCalendar,
                setBookScheduleRows: bindings.setBookScheduleRows,
                setLastResult: bindings.setLastResult,
                setStatus: bindings.setStatus,
                state: bindings.state,
                totalsFromSummary: bindings.totalsFromSummary,
            });
        },
    };
};
