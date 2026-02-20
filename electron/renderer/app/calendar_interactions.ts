

import type { Book } from '../books/types.js';
import type { CalendarRowWithFinish } from '../calendar/data.js';
import { sessionKeyFor, sortRowsByDateAndSession } from '../calendar/utils.js';
import { pruneScheduleCompletions } from './schedule_preserve.js';
import type { PlannerResult, PlannerScheduleRow, PlannerSettings, PlannerSummary } from './types.js';

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

type ManualSessionAddInput = {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
};

type RemoveSessionInput = {
  row: CalendarRowWithFinish;
};

type ManualSessionBook = {
  bookId: string;
  title: string;
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

const DEFAULT_MANUAL_WPM_BASE = 220;
const DEFAULT_DIFFICULTY_MULTIPLIER = 1;
const MIN_MANUAL_MINUTES = 1;
const MIN_MANUAL_WORDS = 1;

function normalizeManualMinutes(minutes: number): number {
  const rounded = Math.round(Number(minutes || 0));
  if (!Number.isFinite(rounded) || rounded < MIN_MANUAL_MINUTES) {
    return MIN_MANUAL_MINUTES;
  }
  return rounded;
}

function historicalWordsPerMinute(bookId: string, rows: PlannerScheduleRow[] = []): number | null {
  let totalWords = 0;
  let totalMinutes = 0;
  rows.forEach((row) => {
    if (String(row.book_id || '') !== bookId) {
      return;
    }
    const rowMinutes = Number(row.minutes || 0);
    const rowWords = Number(row.words_planned || 0);
    if (rowMinutes <= 0 || rowWords <= 0) {
      return;
    }
    totalMinutes += rowMinutes;
    totalWords += rowWords;
  });
  if (totalMinutes <= 0 || totalWords <= 0) {
    return null;
  }
  return totalWords / totalMinutes;
}

function difficultyMultiplier(settings: PlannerSettings, difficulty: number): number {
  const multiplierByDifficulty = settings.difficulty_multiplier || {};
  const exact = multiplierByDifficulty[difficulty];
  const byKey = multiplierByDifficulty[String(difficulty)];
  const multiplier = Number(exact ?? byKey ?? DEFAULT_DIFFICULTY_MULTIPLIER);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return DEFAULT_DIFFICULTY_MULTIPLIER;
  }
  return multiplier;
}

export function wordsPlannedForManualSession({
  bookId,
  minutes,
  rows = [],
  settings = {},
  difficulty = 3,
}: {
  bookId: string;
  minutes: number;
  rows?: PlannerScheduleRow[];
  settings?: PlannerSettings;
  difficulty?: number;
}): number {
  const normalizedMinutes = normalizeManualMinutes(minutes);
  const historicalWpm = historicalWordsPerMinute(bookId, rows);
  if (historicalWpm !== null) {
    return Math.max(MIN_MANUAL_WORDS, Math.round(normalizedMinutes * historicalWpm));
  }

  const base = Number(settings.wpm_base || DEFAULT_MANUAL_WPM_BASE);
  const wpmBase = Number.isFinite(base) && base > 0 ? base : DEFAULT_MANUAL_WPM_BASE;
  const planned = normalizedMinutes * wpmBase * difficultyMultiplier(settings, difficulty);
  return Math.max(MIN_MANUAL_WORDS, Math.round(planned));
}

export function nextSessionIndexForDate(rows: PlannerScheduleRow[] = [], date: string): number {
  let maxIndex = 0;
  rows.forEach((row) => {
    if (String(row.date || '') !== date) {
      return;
    }
    const index = Number(row.session_index || 0);
    if (Number.isFinite(index)) {
      maxIndex = Math.max(maxIndex, Math.floor(index));
    }
  });
  return maxIndex + 1;
}

export function rowsWithoutSession(
  rows: PlannerScheduleRow[] = [],
  targetSessionKey: string,
): PlannerScheduleRow[] {
  const key = String(targetSessionKey || '');
  if (!key) {
    return [...rows];
  }
  return rows.filter((row) => {
    return sessionKeyFor(row) !== key;
  });
}

function emptyPlannerResult(): PlannerResult {
  return {
    schedule: [],
    summary: null,
    created_at: '',
  };
}

function manualSessionBooks(books: Book[] = []): ManualSessionBook[] {
  return books
    .map((book) => ({
      bookId: String(book.book_id || ''),
      title: String(book.title || '').trim(),
    }))
    .filter((book) => book.bookId && book.title)
    .sort((left, right) => left.title.localeCompare(right.title, undefined, { sensitivity: 'base' }));
}

type AppCalendarInteractionArgs = {
  configureCalendarInteractions: (handlers: {
    isSessionCompleted: (sessionKey: string) => boolean;
    onSessionCompletionChanged: (payload: CompletionUpdate) => void;
    onSessionProgressUpdated: (payload: ProgressUpdateInput) => UpdatedBook | null;
    getBookById: (bookId: string) => Book | null;
    listSessionBooks: () => ManualSessionBook[];
    onManualSessionAdded: (payload: ManualSessionAddInput) => boolean;
    onSessionRemoved: (payload: RemoveSessionInput) => boolean;
  }) => void;
  state: {
    scheduleCompletions: Record<string, boolean>;
    lastResult: PlannerResult | null;
  };
  queuePersist: () => void;
  setStatus: (message: string, isError?: boolean) => void;
  collectSettings: () => PlannerSettings;
  collectAllBooks: () => Book[];
  setBookScheduleRows: (rows: PlannerScheduleRow[]) => void;
  renderCalendar: (rows: PlannerScheduleRow[], totals: Record<string, number>) => void;
  totalsFromSummary: (summary: PlannerSummary | null) => Record<string, number>;
  updateBookProgress: (
    bookId: string,
    updates: { pagesRead?: number | null; progressPercent?: number | null },
    options: { notifyBooksChanged?: boolean },
  ) => UpdatedBook | null;
  getBookById: (bookId: string) => Book | null;
  setLastResult: (result: PlannerResult) => void;
  onSessionCompletionUpdated?: (payload: CompletionUpdate) => void;
  onProgressUpdated?: (book: UpdatedBook) => void;
  onScheduleRowsUpdated?: () => void;
};

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
      }
      setStatus(`Updated progress for ${updated.title || "book"}.`);
      queuePersist();
      onProgressUpdated(updated);
      return updated;
    },
    getBookById: (bookId) => getBookById(bookId),
    listSessionBooks: () => {
      return manualSessionBooks(collectAllBooks());
    },
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

      const normalizedMinutes = normalizeManualMinutes(minutes);
      const previousResult = state.lastResult || emptyPlannerResult();
      const previousRows = previousResult.schedule || [];
      const sessionIndex = nextSessionIndexForDate(previousRows, normalizedDate);
      const wordsPlanned = wordsPlannedForManualSession({
        bookId: book.book_id,
        minutes: normalizedMinutes,
        rows: previousRows,
        settings: collectSettings(),
        difficulty: Number(book.difficulty || 3),
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
