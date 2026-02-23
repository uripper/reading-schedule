import { sessionKeyFor } from "../../calendar/utils.js";
import {
  dayBookCompletionKey,
  dayBookCompletionKeyFromSession,
  manualSessionBooks,
  nextSessionIndexForDate,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
import {
  addManualSessionRow,
  removeSessionRow,
  updateSessionRowMinutes,
} from "./calendar_interactions_schedule_updates.js";
import type { AppCalendarInteractionArgs } from "./calendar_interactions_types.js";

type CalendarInteractionHandlers = Parameters<
  AppCalendarInteractionArgs["configureCalendarInteractions"]
>[0];

interface CompletionRow {
  date?: string;
  book_id?: string;
  title?: string;
}

/**
 * Builds the per-day completion fallback key for a schedule row.
 * @param row Partial schedule row data used to derive day/book key.
 * @returns Fallback completion key, or empty string when row data is incomplete.
 */
function completionFallbackKey(row: CompletionRow | null | undefined): string {
  if (row === null || row === undefined) {
    return "";
  }
  if (typeof row.date !== "string" || row.date === "") {
    return "";
  }
  if (typeof row.book_id !== "string" || row.book_id === "") {
    return "";
  }
  return dayBookCompletionKey(row.date, row.book_id);
}

/**
 * Writes completion state updates for session-level and day/book fallback keys.
 * @param scheduleCompletions Mutable completion map keyed by completion identifiers.
 * @param sessionKey Session-specific completion key.
 * @param fallbackKey Day/book fallback key, if available.
 * @param completed Whether the target session is now complete.
 */
function setCompletionState(
  scheduleCompletions: Record<string, boolean>,
  sessionKey: string,
  fallbackKey: string,
  completed: boolean,
): void {
  if (completed) {
    scheduleCompletions[sessionKey] = true;
    if (fallbackKey !== "") {
      scheduleCompletions[fallbackKey] = true;
    }
    return;
  }
  delete scheduleCompletions[sessionKey];
  if (fallbackKey !== "") {
    delete scheduleCompletions[fallbackKey];
  }
}

/**
 * Formats a status message for completion toggles.
 * @param row Schedule row associated with the completion update.
 * @param completed Whether the row is being marked complete.
 * @returns User-facing status text, or empty string when row data is incomplete.
 */
function completionStatusMessage(
  row: CompletionRow | null | undefined,
  completed: boolean,
): string {
  if (row === null || row === undefined) {
    return "";
  }
  if (typeof row.title !== "string" || row.title === "") {
    return "";
  }
  if (typeof row.date !== "string" || row.date === "") {
    return "";
  }
  if (completed) {
    return `Marked "${row.title}" complete on ${row.date}.`;
  }
  return `Marked "${row.title}" incomplete on ${row.date}.`;
}

/**
 * Normalizes runtime callbacks/mutators so handlers can call them safely.
 * @param args Calendar interaction runtime dependencies.
 * @returns Wrapped callbacks and mutable completion state map.
 */
function createInteractionBindings(args: AppCalendarInteractionArgs) {
  return {
    scheduleCompletions: args.state.scheduleCompletions,
    queuePersist(): void {
      args.queuePersist();
    },
    setStatus(message: string, isError?: boolean): void {
      args.setStatus(message, isError);
    },
    collectSettings: (): ReturnType<AppCalendarInteractionArgs["collectSettings"]> => args.collectSettings(),
    collectAllBooks: (): ReturnType<AppCalendarInteractionArgs["collectAllBooks"]> => args.collectAllBooks(),
    setBookScheduleRows: (rows: Parameters<AppCalendarInteractionArgs["setBookScheduleRows"]>[0]): void => {
      args.setBookScheduleRows(rows);
    },
    renderCalendar: (
      rows: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[0],
      totals: Parameters<AppCalendarInteractionArgs["renderCalendar"]>[1],
    ): void => {
      args.renderCalendar(rows, totals);
    },
    totalsFromSummary: (
      summary: Parameters<AppCalendarInteractionArgs["totalsFromSummary"]>[0],
    ): ReturnType<AppCalendarInteractionArgs["totalsFromSummary"]> => args.totalsFromSummary(summary),
    updateBookProgress: (
      bookId: Parameters<AppCalendarInteractionArgs["updateBookProgress"]>[0],
      updates: Parameters<AppCalendarInteractionArgs["updateBookProgress"]>[1],
      options: Parameters<AppCalendarInteractionArgs["updateBookProgress"]>[2],
    ): ReturnType<AppCalendarInteractionArgs["updateBookProgress"]> => args.updateBookProgress(bookId, updates, options),
    getBookById: (bookId: string): ReturnType<AppCalendarInteractionArgs["getBookById"]> => args.getBookById(bookId),
    setLastResult: (
      result: Parameters<AppCalendarInteractionArgs["setLastResult"]>[0],
    ): void => {
      args.setLastResult(result);
    },
    notifySessionCompletionUpdated: (payload: Parameters<NonNullable<AppCalendarInteractionArgs["onSessionCompletionUpdated"]>>[0]): void => {
      if (args.onSessionCompletionUpdated !== undefined) {
        args.onSessionCompletionUpdated(payload);
      }
    },
    notifyProgressUpdated: (
      book: Parameters<NonNullable<AppCalendarInteractionArgs["onProgressUpdated"]>>[0],
    ): void => {
      if (args.onProgressUpdated !== undefined) {
        args.onProgressUpdated(book);
      }
    },
    notifyScheduleRowsUpdated: (): void => {
      if (args.onScheduleRowsUpdated !== undefined) {
        args.onScheduleRowsUpdated();
      }
    },
  };
}

type InteractionBindings = ReturnType<typeof createInteractionBindings>;

/**
 * Builds schedule mutation handlers that update rows and derived state.
 * @param bindings Wrapped runtime callbacks and mutable state refs.
 * @returns Manual-add/minutes-update/remove handler implementations.
 */
function createScheduleMutationHandlers(
  bindings: InteractionBindings,
): Pick<
  CalendarInteractionHandlers,
  "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
> {
  return {
    onManualSessionAdded: ({ date, bookId, minutes, completed = false }) => addManualSessionRow({
      bookId,
      collectSettings: bindings.collectSettings,
      completed,
      date,
      getBookById: bindings.getBookById,
      minutes,
      onScheduleRowsUpdated: bindings.notifyScheduleRowsUpdated,
      queuePersist: bindings.queuePersist,
      renderCalendar: bindings.renderCalendar,
      setBookScheduleRows: bindings.setBookScheduleRows,
      setLastResult: bindings.setLastResult,
      setStatus: bindings.setStatus,
      state: argsState(bindings),
      totalsFromSummary: bindings.totalsFromSummary,
    }),
    onSessionMinutesUpdated: ({ minutes, row }) => updateSessionRowMinutes({
      collectSettings: bindings.collectSettings,
      getBookById: bindings.getBookById,
      minutes,
      onScheduleRowsUpdated: bindings.notifyScheduleRowsUpdated,
      queuePersist: bindings.queuePersist,
      renderCalendar: bindings.renderCalendar,
      row,
      setBookScheduleRows: bindings.setBookScheduleRows,
      setLastResult: bindings.setLastResult,
      setStatus: bindings.setStatus,
      state: argsState(bindings),
      totalsFromSummary: bindings.totalsFromSummary,
    }),
    onSessionRemoved: ({ row }) => removeSessionRow({
      onScheduleRowsUpdated: bindings.notifyScheduleRowsUpdated,
      queuePersist: bindings.queuePersist,
      renderCalendar: bindings.renderCalendar,
      row,
      setBookScheduleRows: bindings.setBookScheduleRows,
      setLastResult: bindings.setLastResult,
      setStatus: bindings.setStatus,
      state: argsState(bindings),
      totalsFromSummary: bindings.totalsFromSummary,
    }),
  };
}

/**
 * Extracts state payload expected by schedule update helper functions.
 * @param bindings Wrapped runtime callbacks and mutable state refs.
 * @returns Interaction state object with completions, blocked books, and last result.
 */
function argsState(bindings: InteractionBindings): {
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: ReturnType<AppCalendarInteractionArgs["updateBookProgress"]> extends infer R
    ? AppCalendarInteractionArgs["state"]["lastResult"]
    : never;
} {
  return {
    scheduleCompletions: bindings.scheduleCompletions,
    blockedDayBooks: {},
    lastResult: null,
  };
}

/**
 * Builds calendar interaction handlers from app runtime dependencies.
 * @param args Integration callbacks and shared runtime state.
 * @returns Calendar interaction handlers consumed by the calendar module.
 */
function buildCalendarHandlers(
  args: AppCalendarInteractionArgs,
): CalendarInteractionHandlers {
  const bindings = createInteractionBindings(args);
  const mutationHandlers = createScheduleMutationHandlers(bindings);
  return {
    isSessionCompleted: (sessionKey) => {
      if (bindings.scheduleCompletions[sessionKey]) {
        return true;
      }
      const fallbackKey = dayBookCompletionKeyFromSession(sessionKey);
      if (fallbackKey === "") {
        return false;
      }
      return bindings.scheduleCompletions[fallbackKey];
    },
    onSessionCompletionChanged: ({ sessionKey, completed, row }) => {
      const fallbackKey = completionFallbackKey(row);
      setCompletionState(bindings.scheduleCompletions, sessionKey, fallbackKey, completed);
      bindings.queuePersist();
      const statusMessage = completionStatusMessage(row, completed);
      if (statusMessage !== "") {
        bindings.setStatus(statusMessage);
      }
      bindings.notifySessionCompletionUpdated({ sessionKey, completed, row });
    },
    onSessionProgressUpdated: ({ bookId, pagesRead, progressPercent, row }) => {
      const updated = bindings.updateBookProgress(
        bookId,
        { pagesRead, progressPercent },
        { notifyBooksChanged: false },
      );
      if (!updated) {
        bindings.setStatus("Could not find that book to update progress.", true);
        return null;
      }
      if (row !== undefined) {
        bindings.scheduleCompletions[sessionKeyFor(row)] = true;
        bindings.scheduleCompletions[dayBookCompletionKey(row.date, row.book_id)] = true;
      }
      const updatedTitle = updated.title;
      if (updatedTitle === "") {
        bindings.setStatus("Updated progress for book.");
      } else {
        bindings.setStatus(`Updated progress for ${updatedTitle}.`);
      }
      bindings.queuePersist();
      bindings.notifyProgressUpdated(updated);
      return updated;
    },
    getBookById: bindings.getBookById,
    listSessionBooks: () => manualSessionBooks(bindings.collectAllBooks()),
    ...mutationHandlers,
  };
}

/**
 * Wires app-level calendar interaction handlers to schedule mutation logic.
 * @param args Integration callbacks and shared runtime state for calendar interactions.
 */
export function configureAppCalendarInteractions(
  args: AppCalendarInteractionArgs,
): void {
  args.configureCalendarInteractions(buildCalendarHandlers(args));
}

export {
  nextSessionIndexForDate,
  rowsWithoutSession,
  wordsPlannedForManualSession,
};
