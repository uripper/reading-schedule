import type { Book } from "../books/types.js";
import {
  fullWordsForBook,
  percentFromWords,
  projectedPages,
  wordsReadFromBook,
} from "./estimates_math.js";

const SESSION_INDEX_PAD = 3;

export type EstimateRow = {
  book_id: string;
  date: string;
  session_index: string | number;
  words_planned?: number;
};

export type EstimateState = {
  rows?: EstimateRow[];
  totalsByBookId?: Record<string, number>;
};

export type BookGetter = (bookId: string) => Book | null;
export type CompletionChecker = (sessionKey: string) => boolean;

export type EstimateSnapshot = {
  changedInSession: boolean;
  endPages: number | null;
  endPercent: number;
  startPages: number | null;
  startPercent: number;
};

function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rowSortKey(row: Pick<EstimateRow, "date" | "session_index">): string {
  const sessionIndex = String(row.session_index).padStart(SESSION_INDEX_PAD, "0");
  return `${row.date}-${sessionIndex}`;
}

function estimateSessionKey(row: EstimateRow): string {
  return `${row.date}|${row.session_index}|${row.book_id}`;
}

function plannedWordsBeforeAndThroughRow(
  row: EstimateRow,
  state: EstimateState,
  bookId: string,
  isSessionCompleted: CompletionChecker,
): { before: number; through: number } {
  const today = todayDateKey();
  const targetDate = String(row.date || "");
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
    if (String(candidate.book_id || "") !== bookId) {
      return;
    }
    const date = String(candidate.date || "");
    if (!date || date < today) {
      return;
    }
    const candidateSortKey = rowSortKey(candidate);
    if (candidateSortKey > targetSortKey) {
      return;
    }
    if (targetIsFuture && isSessionCompleted(estimateSessionKey(candidate))) {
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

export function estimateSnapshotForRow(
  row: EstimateRow,
  state: EstimateState,
  getBookById: BookGetter,
  isSessionCompleted: CompletionChecker,
): EstimateSnapshot | null {
  const bookId = String(row.book_id || "");
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
