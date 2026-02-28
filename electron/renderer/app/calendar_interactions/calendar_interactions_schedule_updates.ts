import {
    type AddManualSessionArgs,
    type PlannerResult,
    type PlannerScheduleRow,
    type RemoveSessionArgs,
    type SharedUpdateArgs,
    type UpdateSessionMinutesArgs,
} from "../../../types/types.js";
import {
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.js";
import { pruneScheduleCompletions } from "../schedule_preserve.js";
import {
    dayBookCompletionKey,
    emptyPlannerResult,
    nextSessionIndexForDate,
    normalizedManualMinutes,
    rowsWithoutSession,
    wordsPlannedForManualSession,
} from "./calendar_interactions_helpers.js";
import { nextRowsWithUpdatedMinutes } from "./calendar_interactions_minutes_rows.js";

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
        created_at: new Date().toISOString(),
        schedule: sortRowsByDateAndSession(rows),
        summary: previousResult.summary ?? null,
    };
}

/**
 * Applies the computed planner result to all bound UI/runtime sinks.
 * Side effects include state mutation, book row updates, and calendar re-render.
 * @param args Shared callbacks and runtime state references.
 * @param nextResult Next planner result to apply.
 */
function applyNextResult(
    args: SharedUpdateArgs,
    nextResult: PlannerResult,
): void {
    const NEXT_STATE = args.state;
    NEXT_STATE.lastResult = nextResult;
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
    const RUNTIME_STATE = args.state;
    const NORMALIZED_DATE = String(date).trim();
    if (!NORMALIZED_DATE) {
        args.setStatus("Choose a calendar day before adding a session.", true);
        return false;
    }
    const BOOK = getBookById(bookId);
    if (!BOOK) {
        args.setStatus("Could not find that book.", true);
        return false;
    }
    const PREVIOUS_RESULT = RUNTIME_STATE.lastResult ?? emptyPlannerResult();
    const PREVIOUS_ROWS = PREVIOUS_RESULT.schedule;
    const SESSION_INDEX = nextSessionIndexForDate(
        NORMALIZED_DATE,
        PREVIOUS_ROWS,
    );
    const NORMALIZED_MINUTES = normalizedManualMinutes(minutes);
    const WORDS_PLANNED = wordsPlannedForManualSession({
        bookId: BOOK.book_id,
        difficulty: Number(BOOK.difficulty),
        minutes: NORMALIZED_MINUTES,
        rows: PREVIOUS_ROWS,
        settings: collectSettings(),
    });
    const ADDED_ROW: PlannerScheduleRow = {
        book_id: BOOK.book_id,
        date: NORMALIZED_DATE,
        minutes: NORMALIZED_MINUTES,
        session_index: SESSION_INDEX,
        title: BOOK.title,
        words_planned: WORDS_PLANNED,
    };
    const NEXT_RESULT = nextResultWithRows(PREVIOUS_RESULT, [
        ...PREVIOUS_ROWS,
        ADDED_ROW,
    ]);
    applyNextResult(args, NEXT_RESULT);
    args.applyStateMutation({
        blocked: false,
        key: dayBookCompletionKey(ADDED_ROW.date, ADDED_ROW.book_id),
        type: "set_blocked_day_book",
    });
    if (completed) {
        const NEXT_COMPLETIONS = {
            ...RUNTIME_STATE.scheduleCompletions,
        };
        NEXT_COMPLETIONS[sessionKeyFor(ADDED_ROW)] = true;
        NEXT_COMPLETIONS[
            dayBookCompletionKey(ADDED_ROW.date, ADDED_ROW.book_id)
        ] = true;
        args.applyStateMutation({
            scheduleCompletions: NEXT_COMPLETIONS,
            type: "set_schedule_completions",
        });
    }
    args.queuePersist();
    args.onScheduleRowsUpdated();
    args.setStatus(
        `Added ${NORMALIZED_MINUTES} minute session for "${ADDED_ROW.title}" on ${NORMALIZED_DATE}.`,
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
export function removeSessionRow({ row, ...args }: RemoveSessionArgs): boolean {
    const RUNTIME_STATE = args.state;
    const PREVIOUS_RESULT = RUNTIME_STATE.lastResult ?? emptyPlannerResult();
    const PREVIOUS_ROWS = PREVIOUS_RESULT.schedule;
    const TARGET_SESSION_KEY = sessionKeyFor(row);
    const NEXT_ROWS = rowsWithoutSession(TARGET_SESSION_KEY, PREVIOUS_ROWS);
    if (NEXT_ROWS.length === PREVIOUS_ROWS.length) {
        args.setStatus("Could not find that session to remove.", true);
        return false;
    }
    const NEXT_COMPLETIONS = pruneScheduleCompletions(
        RUNTIME_STATE.scheduleCompletions,
        NEXT_ROWS,
    );
    args.applyStateMutation({
        scheduleCompletions: NEXT_COMPLETIONS,
        type: "set_schedule_completions",
    });
    args.applyStateMutation({
        blocked: true,
        key: dayBookCompletionKey(row.date, row.book_id),
        type: "set_blocked_day_book",
    });
    const NEXT_RESULT = nextResultWithRows(PREVIOUS_RESULT, NEXT_ROWS);
    applyNextResult(args, NEXT_RESULT);
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
    const PREVIOUS_RESULT = args.state.lastResult ?? emptyPlannerResult();
    const PREVIOUS_ROWS = PREVIOUS_RESULT.schedule;
    const UPDATED_ROWS = nextRowsWithUpdatedMinutes({
        collectSettings,
        getBookById,
        minutes,
        previousRows: PREVIOUS_ROWS,
        row,
    });
    if (!UPDATED_ROWS) {
        args.setStatus("Could not find that session to update.", true);
        return false;
    }
    const NEXT_RESULT = nextResultWithRows(PREVIOUS_RESULT, UPDATED_ROWS.rows);
    applyNextResult(args, NEXT_RESULT);
    args.queuePersist();
    args.onScheduleRowsUpdated();
    args.setStatus(
        `Updated "${row.title}" to ${UPDATED_ROWS.normalizedMinutes} planned minutes.`,
    );
    return true;
}
