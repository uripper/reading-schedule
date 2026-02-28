import { bookCoverSrc } from "../../books/model.js";
import { titleSortKey } from "../../books/title_key.js";
import {
  sessionKeyFor,
  sortRowsByDateAndSession,
} from "../../calendar/utils.js";
import { isOnOrAfterDay } from "../day_keys_compare.js";
import { todayKey } from "../../sessions/utils.js";
import type {
  Book,
  PlannerResult,
  PlannerScheduleRow,
  TodayBookSummary,
  TodayScheduleSnapshot,
} from "../../../types/types.js";

const ZERO_COUNT = 0;
const DEFAULT_TITLE = "Untitled";

/**
 * Returns sorted planned rows from planner result data.
 * @param lastResult Latest planner result.
 * @returns Planned rows sorted by day and session order.
 */
function rowsFromResult(
  lastResult: PlannerResult | null,
): PlannerScheduleRow[] {
  if (!Array.isArray(lastResult?.schedule)) {
    return [];
  }
  return sortRowsByDateAndSession(lastResult.schedule);
}

/**
 * Checks whether a planned row is marked complete in completion map.
 * @param row Planned schedule row.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @returns True when row is completed.
 */
function isCompletedRow(
  row: PlannerScheduleRow,
  scheduleCompletions: Record<string, boolean>,
): boolean {
  return Boolean(scheduleCompletions[sessionKeyFor(row)]);
}

/**
 * Builds a map of books keyed by non-empty book id.
 * @param books Source book catalog.
 * @returns Map of book id to book model.
 */
function booksById(books: Book[]): Map<string, Book> {
  const byId = new Map<string, Book>();
  books.forEach((book) => {
    const bookId = String(book.book_id || "").trim();
    if (!bookId) {
      return;
    }
    byId.set(bookId, book);
  });
  return byId;
}

/**
 * Compares titles using normalized sort keys with stable fallback.
 * @param left Left title.
 * @param right Right title.
 * @returns Locale comparison result.
 */
function compareTitle(left: string, right: string): number {
  const leftKey = titleSortKey(left);
  const rightKey = titleSortKey(right);
  const byKey = leftKey.localeCompare(rightKey, undefined, {
    sensitivity: "base",
  });
  if (byKey !== ZERO_COUNT) {
    return byKey;
  }
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

/**
 * Creates a mutable per-book summary accumulator for today's rows.
 * @param row First row encountered for the book.
 * @param bookById Catalog lookup keyed by book id.
 * @returns Initialized summary object for the book.
 */
function createBookSummary(
  row: PlannerScheduleRow,
  bookById: Map<string, Book>,
): TodayBookSummary {
  const title = String(row.title || DEFAULT_TITLE);
  const bookId = String(row.book_id || "").trim();
  let coverSrc = "";
  const matched = bookById.get(bookId);
  if (matched) {
    coverSrc = bookCoverSrc(matched);
  }
  return {
    title,
    bookId,
    coverSrc,
    plannedMinutes: ZERO_COUNT,
    scheduledSessions: ZERO_COUNT,
    completedSessions: ZERO_COUNT,
  };
}

/**
 * Finds the next uncompleted planned row on or after today.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @returns Next uncompleted row, or null when none remain.
 */
export function nextUncompletedPlannedRow(
  lastResult: PlannerResult | null,
  scheduleCompletions: Record<string, boolean>,
): PlannerScheduleRow | null {
  const today = todayKey();
  const rows = rowsFromResult(lastResult);
  for (const row of rows) {
    const rowDate = String(row.date || "");
    if (
      isOnOrAfterDay(rowDate, today) &&
      !isCompletedRow(row, scheduleCompletions)
    ) {
      return row;
    }
  }
  return null;
}

/**
 * Builds aggregate Today schedule metrics and book-level summaries.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by session identity.
 * @param books Current book catalog used for cover/title metadata.
 * @returns Snapshot used by Today dashboard rendering.
 */
export function buildTodayScheduleSnapshot(
  lastResult: PlannerResult | null,
  scheduleCompletions: Record<string, boolean>,
  books: Book[] = [],
): TodayScheduleSnapshot {
  const today = todayKey();
  const rowList = rowsFromResult(lastResult);
  const booksMap = booksById(books);
  const summariesByBookId = new Map<string, TodayBookSummary>();

  let completedPlannedMinutes = ZERO_COUNT;
  let scheduledSessions = ZERO_COUNT;
  let completedSessions = ZERO_COUNT;

  rowList.forEach((row) => {
    const rowDate = String(row.date || "");
    if (rowDate !== today) {
      return;
    }

    const completed = isCompletedRow(row, scheduleCompletions);
    const bookId = String(row.book_id || "").trim();
    let summary = summariesByBookId.get(bookId);
    if (!summary) {
      summary = createBookSummary(row, booksMap);
      summariesByBookId.set(bookId, summary);
    }

    const plannedMinutes = Number(row.minutes || ZERO_COUNT);
    summary.scheduledSessions += 1;
    summary.plannedMinutes += plannedMinutes;
    scheduledSessions += 1;
    if (!completed) {
      return;
    }
    summary.completedSessions += 1;
    completedSessions += 1;
    completedPlannedMinutes += plannedMinutes;
  });

  const booksForToday = [...summariesByBookId.values()];
  booksForToday.sort((left, right) => {
    return compareTitle(left.title, right.title);
  });

  return {
    completedPlannedMinutes,
    scheduledSessions,
    completedSessions,
    nextUncompletedRow: nextUncompletedPlannedRow(
      lastResult,
      scheduleCompletions,
    ),
    books: booksForToday,
  };
}
