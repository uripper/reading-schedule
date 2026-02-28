
import { sessionKeyFor, sortRowsByDateAndSession } from "./utils.js";
import type { CalendarRow, CalendarRowWithFinish, CompletionChecker, RowsByDate } from "../../types/types.js";

const DAYS_IN_WEEK = 7;

/**
 * Returns today's local day key in `YYYY-MM-DD` format.
 * @returns Local today key.
 */
function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a row date is today or in the future.
 * @param rowDate Row day key.
 * @param today Current day key.
 * @returns `true` when row is today/future and should affect finish estimates.
 */
function rowIsPlannedForTodayOrLater(rowDate: string, today: string): boolean {
  if (!rowDate) {
    return false;
  }
  return Number(rowDate) >= Number(today);
}

/**
 * Applies planned words to per-book running progress accumulator.
 * @param bookId Book id to update.
 * @param plannedWords Words planned in current row.
 * @param progressByBookId Mutable progress accumulator map.
 * @returns Updated cumulative progress for the book.
 */
function nextProgress(
  bookId: string,
  plannedWords: number,
  progressByBookId: Record<string, number>,
): number {
  const nextProgressByBookId = progressByBookId;
  const previousProgress = Number(nextProgressByBookId[bookId] || 0);
  const next = previousProgress + plannedWords;
  nextProgressByBookId[bookId] = next;
  return next;
}

/**
 * Determines whether current row is the first row that finishes a book.
 * @param bookId Book id being evaluated.
 * @param nextBookProgress Cumulative progress after current row.
 * @param totals Total words per book.
 * @param finishedByBookId Mutable map tracking books already marked finished.
 * @returns `true` when this row should receive finish badge.
 */
function isFinishRow(
  bookId: string,
  nextBookProgress: number,
  totals: Record<string, number>,
  finishedByBookId: Record<string, boolean>,
): boolean {
  const nextFinishedByBookId = finishedByBookId;
  if (!bookId) {
    return false;
  }
  const totalWords = Number(totals[bookId] || 0);
  if (totalWords <= 0) {
    return false;
  }
  if (nextFinishedByBookId[bookId]) {
    return false;
  }
  if (nextBookProgress < totalWords) {
    return false;
  }
  nextFinishedByBookId[bookId] = true;
  return true;
}

/**
 * Enriches rows with finish flags used by calendar row rendering.
 * @param rows Raw schedule rows.
 * @param totals Total words per book.
 * @param isSessionCompleted Completion state checker by session key.
 * @returns Rows sorted and annotated with `finish` flag.
 */
export function enrichRows(
  rows: CalendarRow[],
  totals: Record<string, number> = {},
  isSessionCompleted: CompletionChecker = () => false,
): CalendarRowWithFinish[] {
  const progressByBookId: Record<string, number> = {};
  const finishedByBookId: Record<string, boolean> = {};
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  return sortedRows.map((row) => {
    const rowDate = String(row.date || "");
    if (!rowIsPlannedForTodayOrLater(rowDate, today)) {
      return { ...row, finish: false };
    }

    const bookId = String(row.book_id || "");
    const plannedWords = Number(row.words_planned || 0);
    const sessionKey = sessionKeyFor(row);
    const completedToday = rowDate === today && isSessionCompleted(sessionKey);
    let effectivePlannedWords = plannedWords;
    if (completedToday) {
      effectivePlannedWords = 0;
    }
    const nextBookProgress = nextProgress(
      bookId,
      effectivePlannedWords,
      progressByBookId,
    );
    const finishesBook = isFinishRow(
      bookId,
      nextBookProgress,
      totals,
      finishedByBookId,
    );
    if (completedToday) {
      return { ...row, finish: false };
    }
    return { ...row, finish: finishesBook };
  });
}

/**
 * Returns rows reordered so finish rows appear first within a day.
 * @param rows Rows for a single date.
 * @returns Rows with finish rows moved to front.
 */
export function rowsWithFinishFirst(
  rows: CalendarRowWithFinish[] = [],
): CalendarRowWithFinish[] {
  const finishRows: CalendarRowWithFinish[] = [];
  const otherRows: CalendarRowWithFinish[] = [];
  rows.forEach((row) => {
    if (row.finish) {
      finishRows.push(row);
      return;
    }
    otherRows.push(row);
  });
  return [...finishRows, ...otherRows];
}

/**
 * Groups enriched calendar rows by date key.
 * @param rows Enriched rows.
 * @returns Rows grouped by date with finish-first ordering per day.
 */
export function groupRowsByDate(
  rows: CalendarRowWithFinish[] = [],
): RowsByDate {
  const groupedRows = rows.reduce((accumulator, row) => {
    const nextAccumulator = accumulator;
    if (!(row.date in nextAccumulator)) {
      nextAccumulator[row.date] = [];
    }
    nextAccumulator[row.date].push(row);
    return nextAccumulator;
  }, {} as RowsByDate);
  Object.keys(groupedRows).forEach((dateKey) => {
    groupedRows[dateKey] = rowsWithFinishFirst(groupedRows[dateKey]);
  });
  return groupedRows;
}

/**
 * Extracts sorted unique month keys from enriched rows.
 * @param rows Enriched rows.
 * @returns Sorted month keys in `YYYY-MM` format.
 */
export function monthKeysFromRows(
  rows: CalendarRowWithFinish[] = [],
): string[] {
  const monthKeySet = new Set(
    rows.map((row) => row.date.slice(0, DAYS_IN_WEEK)),
  );
  return [...monthKeySet].sort((left, right) => left.localeCompare(right));
}

/**
 * Returns first upcoming row, or earliest row when all are in past.
 * @param rows Raw schedule rows.
 * @returns Row to focus initially, or `null` when no rows exist.
 */
export function firstPlannedRow(rows: CalendarRow[] = []): CalendarRow | null {
  if (!Array.isArray(rows) || !rows.length) {
    return null;
  }
  const sortedRows = sortRowsByDateAndSession(rows);
  const today = todayKey();
  const upcoming = sortedRows.find((row) => Number(row.date || 0) >= Number(today));
  if (upcoming) {
    return upcoming;
  }
  return sortedRows[0];
}
