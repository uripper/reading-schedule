import { sessionKeyFor } from "../calendar/utils.js";
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
      let fallbackKey = "";
      if (row?.date && row?.book_id) {
        fallbackKey = dayBookCompletionKey(row.date, row.book_id);
      }

      if (completed) {
        state.scheduleCompletions[sessionKey] = true;
        if (fallbackKey) {
          state.scheduleCompletions[fallbackKey] = true;
        }
      } else {
        delete state.scheduleCompletions[sessionKey];
        if (fallbackKey) {
          delete state.scheduleCompletions[fallbackKey];
        }
      }
      queuePersist();

      if (row?.title && row?.date) {
        if (completed) {
          setStatus(`Marked "${row.title}" complete on ${row.date}.`);
        } else {
          setStatus(`Marked "${row.title}" incomplete on ${row.date}.`);
        }
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
