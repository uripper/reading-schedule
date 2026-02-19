import type { Book } from '../books/types.js';

const SESSION_INDEX_PAD = 3;
const NO_ESTIMATE_LABEL = 'No estimate available';

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

function bookBaselineWords(book: Book | null, totalWords: number): number {
  const progressPercent = Number(book?.progress_percent || 0);
  const clamped = Math.min(100, Math.max(0, progressPercent));
  return Math.round((clamped / 100) * totalWords);
}

function projectedWordsForRow(
  row: EstimateRow,
  state: EstimateState,
  bookId: string,
  baselineWords: number,
  totalWords: number,
): number {
  const today = todayDateKey();
  const targetSortKey = rowSortKey(row);
  let plannedWords = 0;
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
    if (rowSortKey(candidate) > targetSortKey) {
      return;
    }
    plannedWords += Number(candidate.words_planned || 0);
  });
  return Math.min(totalWords, baselineWords + plannedWords);
}

function projectedPages(projectedWords: number, totalWords: number, pagesTotal: number): number | null {
  if (totalWords <= 0 || pagesTotal <= 0) {
    return null;
  }
  return Math.round((projectedWords / totalWords) * pagesTotal);
}

export function estimateProgressLabel(row: EstimateRow, state: EstimateState, getBookById: BookGetter): string {
  const bookId = String(row.book_id || '');
  if (!bookId) {
    return NO_ESTIMATE_LABEL;
  }

  const totalWords = Number(state.totalsByBookId?.[bookId] || 0);
  if (totalWords <= 0) {
    return NO_ESTIMATE_LABEL;
  }

  const book = getBookById(bookId);
  const baselineWords = bookBaselineWords(book, totalWords);
  const projectedWords = projectedWordsForRow(row, state, bookId, baselineWords, totalWords);
  const projectedPercent = Math.round((projectedWords / totalWords) * 1000) / 10;
  const pagesTotal = Number(book?.pages_total || 0);
  const pages = projectedPages(projectedWords, totalWords, pagesTotal);
  if (pages !== null) {
    return `Estimated by this session: ${pages} pages read (${projectedPercent}% complete)`;
  }
  return `Estimated by this session: ${projectedPercent}% complete`;
}
