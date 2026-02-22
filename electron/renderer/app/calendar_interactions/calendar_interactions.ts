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

function completionFallbackKey(
  row: CompletionRow | null | undefined,
): string {
  if (!row?.date || !row?.book_id) {
    return "";
  }
  return dayBookCompletionKey(row.date, row.book_id);
}

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

export { nextSessionIndexForDate, rowsWithoutSession, wordsPlannedForManualSession } from "./calendar_interactions_helpers.js";
