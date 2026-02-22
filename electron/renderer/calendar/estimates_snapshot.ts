import type { Book } from "../books/types.js";
import {
  fullWordsForBook,
  percentFromWords,
  projectedPages,
  wordsReadFromBook,
} from "./estimates_math.js";
import { plannedWordsBeforeAndThroughRow } from "./estimates_snapshot_rows.js";

export interface EstimateRow {
  book_id: string;
  date: string;
  session_index: string | number;
  words_planned?: number;
}

export interface EstimateState {
  rows?: EstimateRow[];
  totalsByBookId?: Record<string, number>;
}

export type BookGetter = (bookId: string) => Book | null;
export type CompletionChecker = (sessionKey: string) => boolean;

export interface EstimateSnapshot {
  changedInSession: boolean;
  endPages: number | null;
  endPercent: number;
  startPages: number | null;
  startPercent: number;
}

/**
 * Builds estimate snapshot for target row using current progress and plan.
 * @param row Target estimate row.
 * @param state Estimate state context.
 * @param getBookById Book lookup function.
 * @param isSessionCompleted Completion checker.
 * @returns Estimate snapshot or `null` when estimate cannot be computed.
 */
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
