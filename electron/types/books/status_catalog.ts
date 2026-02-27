import type { BOOK_STATUS_DROPPED, BOOK_STATUS_FILTER_ALL, BOOK_STATUS_IN_PROGRESS, BOOK_STATUS_READ, BOOK_STATUS_TO_READ } from "../../renderer/books/status_catalog.js";

export type BookStatus =
  | typeof BOOK_STATUS_TO_READ
  | typeof BOOK_STATUS_IN_PROGRESS
  | typeof BOOK_STATUS_READ
  | typeof BOOK_STATUS_DROPPED;

export type BookStatusFilter = typeof BOOK_STATUS_FILTER_ALL | BookStatus;
