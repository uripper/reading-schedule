import { sessionKeyFor } from "../../calendar/utils.js";
import {
  dayBookCompletionKey,
  dayBookCompletionKeyFromSession,
  manualSessionBooks,
} from "./calendar_interactions_helpers.js";
import {
  addManualSessionRow,
  removeSessionRow,
  updateSessionRowMinutes,
} from "./calendar_interactions_schedule_updates.js";
import type { AppCalendarInteractionArgs } from "./calendar_interactions_types.js";

interface CompletionRow {
  date?: string;
  book_id?: string;
  title?: string;
}

/**
 * Builds the per-day completion fallback key for a schedule row.
 * @param row Partial schedule row data used to derive day/book key.
 * @returns Fallback completion key, or an empty string when row data is incomplete.
 */
function completionFallbackKey(row: CompletionRow | null | undefined): string {
  if (!row?.date || !row?.book_id) {
    return "";
  }
  return dayBookCompletionKey(row.date, row.book_id);
}

/**
 * Writes completion state updates for both session-level and day-book fallback keys.
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
    if (fallbackKey) {
      scheduleCompletions[fallbackKey] = true;
    }
    return;
  }
  delete scheduleCompletions[sessionKey];
  if (fallbackKey) {
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
  if (!row?.title || !row?.date) {
    return "";
  }
  if (completed) {
    return `Marked "${row.title}" complete on ${row.date}.`;
  }
  return `Marked "${row.title}" incomplete on ${row.date}.`;
}

/**
 * Wires app-level calendar interaction handlers to schedule mutation logic.
 * @param root0 Integration callbacks and shared runtime state for calendar interactions.
 * @param root0.configureCalendarInteractions Calendar module binder.
 * @param root0.state Shared app runtime state.
 * @param root0.queuePersist Persists current draft state asynchronously.
 * @param root0.setStatus Sets user-facing status messages.
 * @param root0.collectSettings Reads current planner settings.
 * @param root0.collectAllBooks Reads current book collection.
 * @param root0.setBookScheduleRows Pushes schedule rows into book state.
 * @param root0.renderCalendar Renders calendar UI from rows/totals.
 * @param root0.totalsFromSummary Derives totals map from planner summary.
 * @param root0.updateBookProgress Applies a progress update to a book.
 * @param root0.getBookById Looks up a book by id.
 * @param root0.setLastResult Stores the latest planner result.
 * @param root0.onSessionCompletionUpdated Hook invoked after completion toggles.
 * @param root0.onProgressUpdated Hook invoked after progress updates.
 * @param root0.onScheduleRowsUpdated Hook invoked after schedule row mutations.
 */
export function configureAppCalendarInteractions({
  configureCalendarInteractions,
  state,
  queuePersist,
  setStatus,
  collectSettings,
  collectAllBooks,
  setBookScheduleRows,
  renderCalendar,
  totalsFromSummary,
  updateBookProgress,
  getBookById,
  setLastResult,
  onSessionCompletionUpdated = () => {},
  onProgressUpdated = () => {},
  onScheduleRowsUpdated = () => {},
}: AppCalendarInteractionArgs) {
  configureCalendarInteractions({
    isSessionCompleted: (sessionKey) => {
      if (state.scheduleCompletions?.[sessionKey]) {
        return true;
      }
      const fallbackKey = dayBookCompletionKeyFromSession(sessionKey);
      if (!fallbackKey) {
        return false;
      }
      return Boolean(state.scheduleCompletions?.[fallbackKey]);
    },
    onSessionCompletionChanged: ({ sessionKey, completed, row }) => {
      const fallbackKey = completionFallbackKey(row);
      setCompletionState(
        state.scheduleCompletions,
        sessionKey,
        fallbackKey,
        completed,
      );
      queuePersist();

      const statusMessage = completionStatusMessage(row, completed);
      if (statusMessage) {
        setStatus(statusMessage);
      }
      onSessionCompletionUpdated({ sessionKey, completed, row });
    },
    onSessionProgressUpdated: ({ bookId, pagesRead, progressPercent, row }) => {
      const updated = updateBookProgress(
        bookId,
        { pagesRead, progressPercent },
        { notifyBooksChanged: false },
      );
      if (!updated) {
        setStatus("Could not find that book to update progress.", true);
        return null;
      }
      if (row) {
        const completionKey = sessionKeyFor(row);
        state.scheduleCompletions[completionKey] = true;
        state.scheduleCompletions[dayBookCompletionKey(row.date, row.book_id)] =
          true;
      }
      setStatus(`Updated progress for ${updated.title || "book"}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
    listSessionBooks: () => manualSessionBooks(collectAllBooks()),
    onManualSessionAdded: ({ date, bookId, minutes, completed = false }) =>
      addManualSessionRow({
        bookId,
        collectSettings,
        completed,
        date,
        getBookById,
        minutes,
        onScheduleRowsUpdated,
        queuePersist,
        renderCalendar,
        setBookScheduleRows,
        setLastResult,
        setStatus,
        state,
        totalsFromSummary,
      }),
    onSessionMinutesUpdated: ({ minutes, row }) =>
      updateSessionRowMinutes({
        collectSettings,
        getBookById,
        minutes,
        onScheduleRowsUpdated,
        queuePersist,
        renderCalendar,
        row,
        setBookScheduleRows,
        setLastResult,
        setStatus,
        state,
        totalsFromSummary,
      }),
    onSessionRemoved: ({ row }) =>
      removeSessionRow({
        onScheduleRowsUpdated,
        queuePersist,
        renderCalendar,
        row,
        setBookScheduleRows,
        setLastResult,
        setStatus,
        state,
        totalsFromSummary,
      }),
  });
}

export {
  nextSessionIndexForDate,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
