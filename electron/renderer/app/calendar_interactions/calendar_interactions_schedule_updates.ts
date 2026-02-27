import { sessionKeyFor, sortRowsByDateAndSession } from "../../calendar/utils.js";

import { dayBookCompletionKey, emptyPlannerResult, nextSessionIndexForDate, normalizedManualMinutes, rowsWithoutSession, wordsPlannedForManualSession } from "./calendar_interactions_helpers.js";
import { nextRowsWithUpdatedMinutes } from "./calendar_interactions_minutes_rows.js";
import { pruneScheduleCompletions } from "../schedule_preserve.js";
import type { PlannerResult, PlannerScheduleRow } from "../../../types/types.js";
import type { AddManualSessionArgs, RemoveSessionArgs, SharedUpdateArgs, UpdateSessionMinutesArgs } from "../../../types/app/calendar_interactions/calendar_interactions_schedule_updates.js";

/**
 * Builds a new planner result from replacement schedule rows while preserving
 * the existing summary and stamping a fresh creation timestamp.
 * @param previousResult Existing planner result used as the base.
 * @param rows Replacement schedule rows to persist.
 * @returns Planner result object ready to store in app state.
 */
function nextResultWithRows(
  previousResult: PlannerResult,
  rows: PlannerScheduleRow[],
): PlannerResult {
  return {
    schedule: sortRowsByDateAndSession(rows),
    summary: previousResult.summary ?? null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Applies the computed planner result to all bound UI/runtime sinks.
 * Side effects include state mutation, book row updates, and calendar re-render.
 * @param args Shared callbacks and runtime state references.
 * @param nextResult Next planner result to apply.
 */
function applyNextResult(args: SharedUpdateArgs, nextResult: PlannerResult): void {
  const nextState = args.state;
  nextState.lastResult = nextResult;
  args.setLastResult(nextResult);
  args.setBookScheduleRows(nextResult.schedule);
  args.renderCalendar(
    nextResult.schedule,
    args.totalsFromSummary(nextResult.summary),
  );
}

/**
 * Adds a manual session row for a specific book/day, recalculates words planned,
 * updates state/UI, and optionally marks the new session as completed.
 * @param root0 Manual-session creation args plus shared state callbacks.
 * @param root0.bookId Target book id to schedule.
 * @param root0.collectSettings Function that returns current planner settings.
 * @param root0.completed When true, marks the new row as completed.
 * @param root0.date Day key for the manual session.
 * @param root0.getBookById Function that resolves a book by id.
 * @param root0.minutes Requested session minutes before normalization.
 * @returns `true` when a session is added; otherwise `false` after setting an error status.
 */
export function addManualSessionRow({
  bookId,
  collectSettings,
  completed = false,
  date,
  getBookById,
  minutes,
  ...args
}: AddManualSessionArgs): boolean {
  const runtimeState = args.state;
  const normalizedDate = String(date).trim();
  if (!normalizedDate) {
    args.setStatus("Choose a calendar day before adding a session.", true);
    return false;
  }
  const book = getBookById(bookId);
  if (!book) {
    args.setStatus("Could not find that book.", true);
    return false;
  }
  const previousResult = runtimeState.lastResult ?? emptyPlannerResult();
  const previousRows = previousResult.schedule;
  const sessionIndex = nextSessionIndexForDate(normalizedDate, previousRows);
  const normalizedMinutes = normalizedManualMinutes(minutes);
  const wordsPlanned = wordsPlannedForManualSession({
    bookId: book.book_id,
    minutes: normalizedMinutes,
    rows: previousRows,
    settings: collectSettings(),
    difficulty: Number(book.difficulty),
  });
  const addedRow: PlannerScheduleRow = {
    date: normalizedDate,
    session_index: sessionIndex,
    book_id: book.book_id,
    title: book.title,
    minutes: normalizedMinutes,
    words_planned: wordsPlanned,
  };
  const nextResult = nextResultWithRows(previousResult, [
    ...previousRows,
    addedRow,
  ]);
  applyNextResult(args, nextResult);
  delete runtimeState.blockedDayBooks[
    dayBookCompletionKey(addedRow.date, addedRow.book_id)
  ];
  if (completed) {
    runtimeState.scheduleCompletions[sessionKeyFor(addedRow)] = true;
    runtimeState.scheduleCompletions[
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

/**
 * Removes one scheduled session from the current result and prunes completion
 * keys that no longer map to an existing row.
 * @param root0 Removal args plus shared state callbacks.
 * @param root0.row Schedule row to remove.
 * @returns `true` when a session is removed; otherwise `false` after setting an error status.
 */
export function removeSessionRow({
  row,
  ...args
}: RemoveSessionArgs): boolean {
  const runtimeState = args.state;
  const previousResult = runtimeState.lastResult ?? emptyPlannerResult();
  const previousRows = previousResult.schedule;
  const targetSessionKey = sessionKeyFor(row);
  const nextRows = rowsWithoutSession(targetSessionKey, previousRows);
  if (nextRows.length === previousRows.length) {
    args.setStatus("Could not find that session to remove.", true);
    return false;
  }
  runtimeState.scheduleCompletions = pruneScheduleCompletions(
    runtimeState.scheduleCompletions,
    nextRows,
  );
  runtimeState.blockedDayBooks[dayBookCompletionKey(row.date, row.book_id)] =
    true;
  const nextResult = nextResultWithRows(previousResult, nextRows);
  applyNextResult(args, nextResult);
  args.queuePersist();
  args.onScheduleRowsUpdated();
  args.setStatus(`Removed session for "${row.title}" on ${row.date}.`);
  return true;
}

/**
 * Updates planned minutes for one scheduled session and recalculates
 * words-planned for that row based on current settings/book difficulty.
 * @param root0 Update args plus shared state callbacks.
 * @param root0.collectSettings Function that returns current planner settings.
 * @param root0.getBookById Function that resolves a book by id.
 * @param root0.minutes Requested session minutes before normalization.
 * @param root0.row Schedule row to update.
 * @returns `true` when the target session is updated; otherwise `false` after setting an error status.
 */
export function updateSessionRowMinutes({
  collectSettings,
  getBookById,
  minutes,
  row,
  ...args
}: UpdateSessionMinutesArgs): boolean {
  const previousResult = args.state.lastResult ?? emptyPlannerResult();
  const previousRows = previousResult.schedule;
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
    `Updated "${row.title}" to ${updatedRows.normalizedMinutes} planned minutes.`,
  );
  return true;
}
