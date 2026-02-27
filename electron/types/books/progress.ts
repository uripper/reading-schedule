import type { Book } from "../../renderer/books/types.js";

export interface ProgressTotals {
  hasPagesTotal: boolean;
  pagesTotal: number;
}

export interface PercentUpdateContext extends ProgressTotals {
  hasPagesUpdate: boolean;
}

export interface PagesUpdateResult {
  book: Book;
  hasPagesUpdate: boolean;
}
