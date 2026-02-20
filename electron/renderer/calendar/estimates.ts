import type { Book } from '../books/types.js';
import { WORDS_PER_PAGE } from '../books/constants.js';

const SESSION_INDEX_PAD = 3;
const NO_ESTIMATE_LABEL = 'No estimate available';
const PERCENT_SCALE = 100;
const PERCENT_PRECISION_SCALE = 1000;
type EstimateRow = {
  book_id: string;
  date: string;
  session_index: string | number;
  words_planned?: number;
};

type EstimateState = {
  rows?: EstimateRow[];
  totalsByBookId?: Record<string, number>;
};

type BookGetter = (bookId: string) => Book | null;
type CompletionChecker = (sessionKey: string) => boolean;
type EstimateSnapshot = {
  startPercent: number;
  endPercent: number;
  startPages: number | null;
  endPages: number | null;
  changedInSession: boolean;
};
function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function rowSortKey(row: Pick<EstimateRow, 'date' | 'session_index'>): string {
  const sessionIndex = String(row.session_index).padStart(SESSION_INDEX_PAD, '0');
  return `${row.date}-${sessionIndex}`;
}
function estimateSessionKey(row: EstimateRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}
function clampPercent(progressPercent: number): number {
  return Math.min(PERCENT_SCALE, Math.max(0, progressPercent));
}
function fullWordsForBook(book: Book | null, remainingWords: number): number {
  const wordsTotal = Number(book?.words_total || 0);
  if (Number.isFinite(wordsTotal) && wordsTotal > 0) {
    return wordsTotal;
  }

  const pagesTotal = Number(book?.pages_total || 0);
  if (Number.isFinite(pagesTotal) && pagesTotal > 0) {
    return pagesTotal * WORDS_PER_PAGE;
  }

  if (Number.isFinite(remainingWords) && remainingWords > 0) {
    return remainingWords;
  }

  return 0;
}
function wordsReadFromBook(book: Book | null, fullWords: number): number {
  const progressPercent = Number(book?.progress_percent || 0);
  const clamped = clampPercent(progressPercent);
  return Math.round((clamped / PERCENT_SCALE) * fullWords);
}
function plannedWordsBeforeAndThroughRow(
  row: EstimateRow,
  state: EstimateState,
  bookId: string,
  isSessionCompleted: CompletionChecker,
): { before: number; through: number } {
  const today = todayDateKey();
  const targetDate = String(row.date || '');
  const targetSessionKey = estimateSessionKey(row);
  if (targetDate === today && isSessionCompleted(targetSessionKey)) {
    return { before: 0, through: 0 };
  }

  const targetIsFuture = targetDate > today;
  const targetSortKey = rowSortKey(row);
  let before = 0;
  let through = 0;
  const rows: EstimateRow[] = [];
  if (Array.isArray(state.rows)) {
    rows.push(...state.rows);
  }
  rows.forEach((candidate) => {
    if (String(candidate.book_id || '') !== bookId) {
      return;
    }
    const date = String(candidate.date || '');
    if (!date || date < today) {
      return;
    }
    const candidateSortKey = rowSortKey(candidate);
    if (candidateSortKey > targetSortKey) {
      return;
    }
    const completed = isSessionCompleted(estimateSessionKey(candidate));
    if (targetIsFuture && completed) {
      return;
    }
    const plannedWords = Math.max(0, Number(candidate.words_planned || 0));
    through += plannedWords;
    if (candidateSortKey < targetSortKey) {
      before += plannedWords;
    }
  });
  return { before, through };
}
function projectedPages(projectedPercent: number, pagesTotal: number): number | null {
  if (pagesTotal <= 0) {
    return null;
  }
  return Math.round((projectedPercent / PERCENT_SCALE) * pagesTotal);
}
function percentFromWords(wordsRead: number, fullWords: number): number {
  if (fullWords <= 0) {
    return 0;
  }
  return Math.round((wordsRead / fullWords) * PERCENT_PRECISION_SCALE) / 10;
}
function estimateSnapshotForRow(
  row: EstimateRow,
  state: EstimateState,
  getBookById: BookGetter,
  isSessionCompleted: CompletionChecker,
): EstimateSnapshot | null {
  const bookId = String(row.book_id || '');
  if (!bookId) {
    return null;
  }

  const remainingWords = Number(state.totalsByBookId?.[bookId] || 0);
  const book = getBookById(bookId);
  const fullWords = fullWordsForBook(book, remainingWords);
  if (fullWords <= 0) {
    return null;
  }

  const pagesTotal = Number(book?.pages_total || 0);
  const currentWordsRead = wordsReadFromBook(book, fullWords);
  const plannedWords = plannedWordsBeforeAndThroughRow(
    row,
    state,
    bookId,
    isSessionCompleted,
  );
  const startWords = Math.min(fullWords, currentWordsRead + plannedWords.before);
  const endWords = Math.min(fullWords, currentWordsRead + plannedWords.through);
  const startPercent = percentFromWords(startWords, fullWords);
  const endPercent = percentFromWords(endWords, fullWords);

  return {
    startPercent,
    endPercent,
    startPages: projectedPages(startPercent, pagesTotal),
    endPages: projectedPages(endPercent, pagesTotal),
    changedInSession: endPercent > startPercent,
  };
}
function estimateLabelWithPages(snapshot: EstimateSnapshot): string {
  const {startPages, endPages} = snapshot;
  if (startPages === null || endPages === null) {
    return NO_ESTIMATE_LABEL;
  }
  if (!snapshot.changedInSession) {
    return `Estimated by end of this session: ${endPages} pages read (${snapshot.endPercent}% complete)`;
  }
  return `Estimated before session: ${startPages} pages (${snapshot.startPercent}%) -> after session: ${endPages} pages (${snapshot.endPercent}%)`;
}
function estimateLabelWithoutPages(snapshot: EstimateSnapshot): string {
  if (!snapshot.changedInSession) {
    return `Estimated by end of this session: ${snapshot.endPercent}% complete`;
  }
  return `Estimated before session: ${snapshot.startPercent}% -> after session: ${snapshot.endPercent}%`;
}
export function estimateProgressLabel(
  row: EstimateRow,
  state: EstimateState,
  getBookById: BookGetter,
  isSessionCompleted: CompletionChecker = () => false,
): string {
  const snapshot = estimateSnapshotForRow(
    row,
    state,
    getBookById,
    isSessionCompleted,
  );
  if (!snapshot) {
    return NO_ESTIMATE_LABEL;
  }
  if (snapshot.startPages !== null && snapshot.endPages !== null) {
    return estimateLabelWithPages(snapshot);
  }
  return estimateLabelWithoutPages(snapshot);
}
