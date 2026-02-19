

import type { Book } from '../books/types.js';
import type { CalendarRowWithFinish } from '../calendar/data.js';

type ScheduleRow = {
  title?: string;
  date?: string;
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

type AppCalendarInteractionArgs = {
  configureCalendarInteractions: (handlers: {
    isSessionCompleted: (sessionKey: string) => boolean;
    onSessionCompletionChanged: (payload: CompletionUpdate) => void;
    onSessionProgressUpdated: (payload: ProgressUpdateInput) => UpdatedBook | null;
    getBookById: (bookId: string) => Book | null;
  }) => void;
  state: { scheduleCompletions: Record<string, boolean> };
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
    isSessionCompleted: (sessionKey) => Boolean(state.scheduleCompletions?.[sessionKey]),
    onSessionCompletionChanged: ({ sessionKey, completed, row }) => {
      if (completed) {
        state.scheduleCompletions[sessionKey] = true;
      } else {
        delete state.scheduleCompletions[sessionKey];
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
    onSessionProgressUpdated: ({ bookId, pagesRead, progressPercent }) => {
      const updated = updateBookProgress(
        bookId,
        { pagesRead, progressPercent },
        { notifyBooksChanged: false },
      );
      if (!updated) {
        setStatus("Could not find that book to update progress.", true);
        return null;
      }
      setStatus(`Updated progress for ${updated.title || "book"}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
  });
}
