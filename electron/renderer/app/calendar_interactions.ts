

import type { Book } from '../books/types.js';
import type { CalendarRowWithFinish } from '../calendar/data.js';
import { sessionKeyFor } from '../calendar/utils.js';

type ScheduleRow = {
  title?: string;
  date?: string;
  book_id?: string;
};

type CompletionUpdate = {
  sessionKey: string;
  completed: boolean;
  row?: ScheduleRow;
};

type ProgressUpdateInput = {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row?: CalendarRowWithFinish;
};

type UpdatedBook = Book;

function dayBookCompletionKey(rowDate: string, bookId: string): string {
  return `${rowDate}|${bookId}`;
}

function dayBookCompletionKeyFromSession(sessionKey: string): string {
  const [date, , bookId] = String(sessionKey || '').split('|');
  if (!date || !bookId) {
    return '';
  }
  return dayBookCompletionKey(date, bookId);
}

type AppCalendarInteractionArgs = {
  configureCalendarInteractions: (handlers: {
    isSessionCompleted: (sessionKey: string) => boolean;
    hasSessionProgressUpdate: (sessionKey: string) => boolean;
    onSessionCompletionChanged: (payload: CompletionUpdate) => void;
    onSessionProgressUpdated: (payload: ProgressUpdateInput) => UpdatedBook | null;
    getBookById: (bookId: string) => Book | null;
  }) => void;
  state: {
    scheduleCompletions: Record<string, boolean>;
    scheduleProgressUpdates: Record<string, boolean>;
  };
  queuePersist: () => void;
  setStatus: (message: string, isError?: boolean) => void;
  updateBookProgress: (
    bookId: string,
    updates: { pagesRead?: number | null; progressPercent?: number | null },
    options: { notifyBooksChanged?: boolean },
  ) => UpdatedBook | null;
  getBookById: (bookId: string) => Book | null;
  onSessionCompletionUpdated?: (payload: CompletionUpdate) => void;
  onProgressUpdated?: (book: UpdatedBook) => void;
};

export function configureAppCalendarInteractions({
  configureCalendarInteractions,
  state,
  queuePersist,
  setStatus,
  updateBookProgress,
  getBookById,
  onSessionCompletionUpdated = () => {},
  onProgressUpdated = () => {},
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
    hasSessionProgressUpdate: (sessionKey) => {
      if (state.scheduleProgressUpdates?.[sessionKey]) {
        return true;
      }
      const fallbackKey = dayBookCompletionKeyFromSession(sessionKey);
      if (!fallbackKey) {
        return false;
      }
      return Boolean(state.scheduleProgressUpdates?.[fallbackKey]);
    },
    onSessionCompletionChanged: ({ sessionKey, completed, row }) => {
      const fallbackKey = row?.date && row?.book_id ? dayBookCompletionKey(row.date, row.book_id) : '';
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
        delete state.scheduleProgressUpdates[sessionKey];
        if (fallbackKey) {
          delete state.scheduleProgressUpdates[fallbackKey];
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
        state.scheduleCompletions[dayBookCompletionKey(row.date, row.book_id)] = true;
        state.scheduleProgressUpdates[completionKey] = true;
        state.scheduleProgressUpdates[dayBookCompletionKey(row.date, row.book_id)] = true;
      }
      setStatus(`Updated progress for ${updated.title || "book"}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
  });
}
