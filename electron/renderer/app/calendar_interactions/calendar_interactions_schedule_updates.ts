import type {
    AddManualSessionArgs,
    AppStateMutation,
    Book,
    PlannerResult,
    PlannerScheduleRow,
    PlannerSettings,
    RemoveSessionArgs,
    SharedUpdateArgs,
    UpdateSessionMinutesArgs,
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
 * @param previousResult - Existing planner result used as the base.
 * @param rows - Replacement schedule rows to persist.
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
 * @param args - Shared callbacks and runtime state references.
 * @param nextResult - Next planner result to apply.
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
 * @param root0 - Manual-session creation args plus shared state callbacks.
 * @param bookId - Target book id to schedule.
 * @param collectSettings - Function that returns current planner settings.
 * @param completed - When true, marks the new row as completed.
 * @param date - Day key for the manual session.
 * @param getBookById - Function that resolves a book by id.
 * @param minutes - Requested session minutes before normalization.
 * @returns `true` when a session is added; otherwise `false` after setting an error status.
 */
/**
 * Validates date and book for manual session addition.
 */
function validateManualSessionInput(
    date: string,
    bookId: string,
    getBookById: (id: string) => Book | null,
    setStatus: (msg: string, isError: boolean) => void,
): { normalizedDate: string; book: Book } | null {
    const NORMALIZED_DATE = String(date).trim();
    if (!NORMALIZED_DATE) {
        setStatus("Choose a calendar day before adding a session.", true);
        return null;
    }
    const BOOK = getBookById(bookId);
    if (!BOOK) {
        setStatus("Could not find that book.", true);
        return null;
    }
    return { book: BOOK, normalizedDate: NORMALIZED_DATE };
}

interface BuildRowArgs {
    book: Book;
    collectSettings: () => PlannerSettings;
    minutes: number;
    normalizedDate: string;
    previousRowsAndResult: {
        rows: PlannerScheduleRow[];
        result: PlannerResult;
    };
}

/**
 * Creates a schedule row for manual session addition and plans words.
 */
function buildManualSessionRowAndResult(args: BuildRowArgs): {
    row: PlannerScheduleRow;
    result: PlannerResult;
} {
    const SESSION_INDEX = nextSessionIndexForDate(
        args.normalizedDate,
        args.previousRowsAndResult.rows,
    );
    const NORMALIZED_MINUTES = normalizedManualMinutes(args.minutes);
    const WORDS_PLANNED = wordsPlannedForManualSession({
        bookId: args.book.book_id,
        difficulty: Number(args.book.difficulty),
        minutes: NORMALIZED_MINUTES,
        rows: args.previousRowsAndResult.rows,
        settings: args.collectSettings(),
    });
    const ADDED_ROW: PlannerScheduleRow = {
        book_id: args.book.book_id,
        date: args.normalizedDate,
        minutes: NORMALIZED_MINUTES,
        session_index: SESSION_INDEX,
        title: args.book.title,
        words_planned: WORDS_PLANNED,
    };
    const NEXT_RESULT = nextResultWithRows(args.previousRowsAndResult.result, [
        ...args.previousRowsAndResult.rows,
        ADDED_ROW,
    ]);
    return { result: NEXT_RESULT, row: ADDED_ROW };
}

/**
 * Marks manual session as completed in schedule.
 */
function markSessionCompleted(
    row: PlannerScheduleRow,
    scheduleCompletions: Record<string, boolean>,
    applyStateMutation: (mutation: AppStateMutation) => void,
): void {
    const NEXT_COMPLETIONS = { ...scheduleCompletions };
    NEXT_COMPLETIONS[sessionKeyFor(row)] = true;
    NEXT_COMPLETIONS[dayBookCompletionKey(row.date, row.book_id)] = true;
    applyStateMutation({
        scheduleCompletions: NEXT_COMPLETIONS,
        type: "set_schedule_completions",
    });
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
    const RUNTIME_STATE = args.state;
    const VALIDATED = validateManualSessionInput(
        date,
        bookId,
        getBookById,
        args.setStatus,
    );
    if (!VALIDATED) {
        return false;
    }
    const PREVIOUS_RESULT = RUNTIME_STATE.lastResult ?? emptyPlannerResult();
    const PREVIOUS_ROWS = PREVIOUS_RESULT.schedule;
    const { row: ADDED_ROW, result: NEXT_RESULT } =
        buildManualSessionRowAndResult({
            book: VALIDATED.book,
            collectSettings,
            minutes,
            normalizedDate: VALIDATED.normalizedDate,
            previousRowsAndResult: {
                result: PREVIOUS_RESULT,
                rows: PREVIOUS_ROWS,
            },
        });
    applyNextResult(args, NEXT_RESULT);
    args.applyStateMutation({
        blocked: false,
        key: dayBookCompletionKey(ADDED_ROW.date, ADDED_ROW.book_id),
        type: "set_blocked_day_book",
    });
    if (completed) {
        markSessionCompleted(
            ADDED_ROW,
            RUNTIME_STATE.scheduleCompletions,
            args.applyStateMutation,
        );
    }
    args.queuePersist();
    args.onScheduleRowsUpdated();
    args.setStatus(
        `Added ${ADDED_ROW.minutes} minute session for "${ADDED_ROW.title}" on ${VALIDATED.normalizedDate}.`,
    );
    return true;
}

/**
 * Removes one scheduled session from the current result and prunes completion
 * keys that no longer map to an existing row.
 * @param root0 - Removal args plus shared state callbacks.
 * @param row - Schedule row to remove.
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
 * @param root0 - Update args plus shared state callbacks.
 * @param root0.collectSettings - Function that returns current planner settings.
 * @param root0.getBookById - Function that resolves a book by id.
 * @param root0.minutes - Requested session minutes before normalization.
 * @param root0.row - Schedule row to update.
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
