import {
  addManualSessionRow,
  removeSessionRow,
  updateSessionRowMinutes,
} from "./calendar_interactions_schedule_updates.js";
import type { AppCalendarInteractionArgs } from "./calendar_interactions_types.js";

type CalendarInteractionHandlers = Parameters<
  AppCalendarInteractionArgs["configureCalendarInteractions"]
>[0];

type ScheduleMutationHandlers = Pick<
  CalendarInteractionHandlers,
  "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
>;

interface SharedScheduleBindings {
  collectSettings: AppCalendarInteractionArgs["collectSettings"];
  getBookById: AppCalendarInteractionArgs["getBookById"];
  onScheduleRowsUpdated(this: void): void;
  queuePersist(this: void): void;
  renderCalendar: AppCalendarInteractionArgs["renderCalendar"];
  setBookScheduleRows: AppCalendarInteractionArgs["setBookScheduleRows"];
  setLastResult: AppCalendarInteractionArgs["setLastResult"];
  setStatus: AppCalendarInteractionArgs["setStatus"];
  state: AppCalendarInteractionArgs["state"];
  totalsFromSummary: AppCalendarInteractionArgs["totalsFromSummary"];
}

const createSharedScheduleBindings = (
  args: AppCalendarInteractionArgs,
): SharedScheduleBindings => {
  const onScheduleRowsUpdated = (): void => {
    if (args.onScheduleRowsUpdated !== undefined) {
      args.onScheduleRowsUpdated();
    }
  };
  const collectSettings = (): ReturnType<AppCalendarInteractionArgs["collectSettings"]> => {
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
  const setStatus = (message: string, isError?: boolean): void => {
    args.setStatus(message, isError);
  };
  const totalsFromSummary = (
    summary: Parameters<AppCalendarInteractionArgs["totalsFromSummary"]>[0],
  ): ReturnType<AppCalendarInteractionArgs["totalsFromSummary"]> => {
    return args.totalsFromSummary(summary);
  };
  return {
    collectSettings,
    getBookById,
    onScheduleRowsUpdated,
    queuePersist,
    renderCalendar,
    setBookScheduleRows,
    setLastResult,
    setStatus,
    state: args.state,
    totalsFromSummary,
  };
};

export const buildScheduleMutationHandlers = (
  args: AppCalendarInteractionArgs,
): ScheduleMutationHandlers => {
  const bindings = createSharedScheduleBindings(args);
  return {
    onManualSessionAdded: ({ date, bookId, minutes, completed = false }) => {
      return addManualSessionRow({
        bookId,
        collectSettings: bindings.collectSettings,
        completed,
        date,
        getBookById: bindings.getBookById,
        minutes,
        onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
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
        collectSettings: bindings.collectSettings,
        getBookById: bindings.getBookById,
        minutes,
        onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
        queuePersist: bindings.queuePersist,
        renderCalendar: bindings.renderCalendar,
        row,
        setBookScheduleRows: bindings.setBookScheduleRows,
        setLastResult: bindings.setLastResult,
        setStatus: bindings.setStatus,
        state: bindings.state,
        totalsFromSummary: bindings.totalsFromSummary,
      });
    },
    onSessionRemoved: ({ row }) => {
      return removeSessionRow({
        onScheduleRowsUpdated: bindings.onScheduleRowsUpdated,
        queuePersist: bindings.queuePersist,
        renderCalendar: bindings.renderCalendar,
        row,
        setBookScheduleRows: bindings.setBookScheduleRows,
        setLastResult: bindings.setLastResult,
        setStatus: bindings.setStatus,
        state: bindings.state,
        totalsFromSummary: bindings.totalsFromSummary,
      });
    },
  };
};
