import type { Book } from "../../renderer/books/types.js";

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
