import { sortRowsByDateAndSession, sessionKeyFor } from '../calendar/utils.js';
import { pruneScheduleCompletions } from './schedule_preserve.js';
import {
  dayBookCompletionKey,
  dayBookCompletionKeyFromSession,
  emptyPlannerResult,
  manualSessionBooks,
  nextSessionIndexForDate,
  normalizedManualMinutes,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from './calendar_interactions_helpers.js';
import type { AppCalendarInteractionArgs } from './calendar_interactions_types.js';
import type { PlannerResult, PlannerScheduleRow } from './types.js';



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
      let fallbackKey = '';
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
        setStatus('Could not find that book to update progress.', true);
        return null;
      }
      if (row) {
        const completionKey = sessionKeyFor(row);
        state.scheduleCompletions[completionKey] = true;
        state.scheduleCompletions[dayBookCompletionKey(row.date, row.book_id)] = true;
      }
      setStatus(`Updated progress for ${updated.title || 'book'}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
    listSessionBooks: () => manualSessionBooks(collectAllBooks()),
    onManualSessionAdded: ({ date, bookId, minutes, completed = false }) => {
      const normalizedDate = String(date || '').trim();
      if (!normalizedDate) {
        setStatus('Choose a calendar day before adding a session.', true);
        return false;
      }

      const book = getBookById(bookId);
      if (!book) {
        setStatus('Could not find that book.', true);
        return false;
      }

      const DEFAULT_DIFFICULTY = 3;
      const normalizedMinutes = normalizedManualMinutes(minutes);
      const previousResult = state.lastResult || emptyPlannerResult();
      const previousRows = previousResult.schedule || [];
      const sessionIndex = nextSessionIndexForDate(previousRows, normalizedDate);
      const wordsPlanned = wordsPlannedForManualSession({
        bookId: book.book_id,
        minutes: normalizedMinutes,
        rows: previousRows,
        settings: collectSettings(),
        difficulty: Number(book.difficulty || DEFAULT_DIFFICULTY),
      });

      const addedRow: PlannerScheduleRow = {
        date: normalizedDate,
        session_index: sessionIndex,
        book_id: book.book_id,
        title: book.title || 'Untitled',
        minutes: normalizedMinutes,
        words_planned: wordsPlanned,
      };

      const nextRows = sortRowsByDateAndSession([...previousRows, addedRow]);
      const nextResult: PlannerResult = {
        schedule: nextRows,
        summary: previousResult.summary || null,
        created_at: new Date().toISOString(),
      };
      state.lastResult = nextResult;
      setLastResult(nextResult);
      setBookScheduleRows(nextRows);
      renderCalendar(nextRows, totalsFromSummary(nextResult.summary));

      if (completed) {
        state.scheduleCompletions[sessionKeyFor(addedRow)] = true;
        state.scheduleCompletions[dayBookCompletionKey(addedRow.date, addedRow.book_id)] = true;
      }

      queuePersist();
      onScheduleRowsUpdated();
      setStatus(`Added ${normalizedMinutes} minute session for "${addedRow.title}" on ${normalizedDate}.`);
      return true;
    },
    onSessionRemoved: ({ row }) => {
      const previousResult = state.lastResult || emptyPlannerResult();
      const previousRows = previousResult.schedule || [];
      const targetSessionKey = sessionKeyFor(row);
      const nextRows = rowsWithoutSession(previousRows, targetSessionKey);
      if (nextRows.length === previousRows.length) {
        setStatus('Could not find that session to remove.', true);
        return false;
      }

      const nextCompletions = pruneScheduleCompletions(state.scheduleCompletions, nextRows);
      state.scheduleCompletions = nextCompletions;
      const nextResult: PlannerResult = {
        schedule: sortRowsByDateAndSession(nextRows),
        summary: previousResult.summary || null,
        created_at: new Date().toISOString(),
      };
      state.lastResult = nextResult;
      setLastResult(nextResult);
      setBookScheduleRows(nextResult.schedule);
      renderCalendar(nextResult.schedule, totalsFromSummary(nextResult.summary));

      queuePersist();
      onScheduleRowsUpdated();
      setStatus(`Removed session for "${row.title || 'book'}" on ${row.date}.`);
      return true;
    },
  });
}

export {nextSessionIndexForDate, rowsWithoutSession, wordsPlannedForManualSession} from './calendar_interactions_helpers.js';
