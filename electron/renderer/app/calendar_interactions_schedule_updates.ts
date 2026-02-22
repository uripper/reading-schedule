import { sessionKeyFor, sortRowsByDateAndSession } from "../calendar/utils.js";
import type { Book } from "../books/types.js";
import {
  dayBookCompletionKey,
  emptyPlannerResult,
  nextSessionIndexForDate,
  normalizedManualMinutes,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
import { nextRowsWithUpdatedMinutes } from "./calendar_interactions_minutes_rows.js";
import { pruneScheduleCompletions } from "./schedule_preserve.js";
import type {
  PlannerResult,
  PlannerScheduleRow,
  PlannerSettings,
  PlannerSummary,
} from "./types.js";

const DEFAULT_DIFFICULTY = 3;

type SharedUpdateArgs = {
  onScheduleRowsUpdated: () => void;
  queuePersist: () => void;
  renderCalendar: (
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ) => void;
  setBookScheduleRows: (rows: PlannerScheduleRow[]) => void;
  setLastResult: (result: PlannerResult) => void;
  setStatus: (message: string, isError?: boolean) => void;
  state: {
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
  };
  totalsFromSummary: (summary: PlannerSummary | null) => Record<string, number>;
};

type AddManualSessionArgs = SharedUpdateArgs & {
  bookId: string;
  collectSettings: () => PlannerSettings;
  completed?: boolean;
  date: string;
  getBookById: (bookId: string) => Book | null;
  minutes: number;
};

type RemoveSessionArgs = SharedUpdateArgs & {
  row: PlannerScheduleRow;
};

type UpdateSessionMinutesArgs = SharedUpdateArgs & {
  collectSettings: () => PlannerSettings;
  getBookById: (bookId: string) => Book | null;
  minutes: number;
  row: PlannerScheduleRow;
};

function nextResultWithRows(
  previousResult: PlannerResult,
  rows: PlannerScheduleRow[],
): PlannerResult {
  return {
    schedule: sortRowsByDateAndSession(rows),
    summary: previousResult.summary || null,
    created_at: new Date().toISOString(),
  };
}

function applyNextResult(args: SharedUpdateArgs, nextResult: PlannerResult): void {
  args.state.lastResult = nextResult;
  args.setLastResult(nextResult);
  args.setBookScheduleRows(nextResult.schedule);
  args.renderCalendar(
    nextResult.schedule,
    args.totalsFromSummary(nextResult.summary),
  );
}

export function addManualSessionRow({
  bookId,
  collectSettings,
  completed = false,
  date,
  getBookById,
  minutes,
  ...args
}: AddManualSessionArgs): boolean {
  const normalizedDate = String(date || "").trim();
  if (!normalizedDate) {
    args.setStatus("Choose a calendar day before adding a session.", true);
    return false;
  }
  const book = getBookById(bookId);
  if (!book) {
    args.setStatus("Could not find that book.", true);
    return false;
  }
  const previousResult = args.state.lastResult || emptyPlannerResult();
  const previousRows = previousResult.schedule || [];
  const sessionIndex = nextSessionIndexForDate(normalizedDate, previousRows);
  const normalizedMinutes = normalizedManualMinutes(minutes);
  const wordsPlanned = wordsPlannedForManualSession({
    bookId: book.book_id,
    minutes: normalizedMinutes,
    rows: previousRows,
    settings: collectSettings(),
    difficulty: Number(book.difficulty || DEFAULT_DIFFICULTY),
  });
  const addedRow: PlannerScheduleRow = {
    date: normalizedDate,
    session_index: sessionIndex,
    book_id: book.book_id,
    title: book.title || "Untitled",
    minutes: normalizedMinutes,
    words_planned: wordsPlanned,
  };
  const nextResult = nextResultWithRows(previousResult, [
    ...previousRows,
    addedRow,
  ]);
  applyNextResult(args, nextResult);
  if (completed) {
    args.state.scheduleCompletions[sessionKeyFor(addedRow)] = true;
    args.state.scheduleCompletions[
      dayBookCompletionKey(addedRow.date, addedRow.book_id)
    ] = true;
  }
  args.queuePersist();
  args.onScheduleRowsUpdated();
  args.setStatus(
    `Added ${normalizedMinutes} minute session for "${addedRow.title}" on ${normalizedDate}.`,
  );
  return true;
}

export function removeSessionRow({
  row,
  ...args
}: RemoveSessionArgs): boolean {
  const previousResult = args.state.lastResult || emptyPlannerResult();
  const previousRows = previousResult.schedule || [];
  const targetSessionKey = sessionKeyFor(row);
  const nextRows = rowsWithoutSession(targetSessionKey, previousRows);
  if (nextRows.length === previousRows.length) {
    args.setStatus("Could not find that session to remove.", true);
    return false;
  }
  args.state.scheduleCompletions = pruneScheduleCompletions(
    args.state.scheduleCompletions,
    nextRows,
  );
  const nextResult = nextResultWithRows(previousResult, nextRows);
  applyNextResult(args, nextResult);
  args.queuePersist();
  args.onScheduleRowsUpdated();
  args.setStatus(`Removed session for "${row.title || "book"}" on ${row.date}.`);
  return true;
}

export function updateSessionRowMinutes({
  collectSettings,
  getBookById,
  minutes,
  row,
  ...args
}: UpdateSessionMinutesArgs): boolean {
  const previousResult = args.state.lastResult || emptyPlannerResult();
  const previousRows = previousResult.schedule || [];
  const updatedRows = nextRowsWithUpdatedMinutes({
    collectSettings,
    getBookById,
    minutes,
    previousRows,
    row,
  });
  if (!updatedRows) {
    args.setStatus("Could not find that session to update.", true);
    return false;
  }
  const nextResult = nextResultWithRows(previousResult, updatedRows.rows);
  applyNextResult(args, nextResult);
  args.queuePersist();
  args.onScheduleRowsUpdated();
  args.setStatus(
    `Updated "${row.title || "session"}" to ${updatedRows.normalizedMinutes} planned minutes.`,
  );
  return true;
}
