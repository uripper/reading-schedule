import type {
    AppStateMutation,
    PlannerResult,
    PlannerScheduleRow,
    RemoveSessionArgs,
    SharedUpdateArgs,
    UpdateSessionMinutesArgs,
} from "../../../types/types.ts";
import {
    dayBookCompletionKey,
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../../calendar/utils.ts";
import { pruneScheduleCompletions } from "../schedule_preserve.ts";
import { emptyPlannerResult } from "./calendar_interactions_helpers.ts";
import { nextRowsWithUpdatedMinutes } from "./calendar_interactions_minutes_rows.ts";
import { rowsWithoutSession } from "./calendar_interactions_row_helpers.ts";

interface RemovedSessionResult {
    nextCompletions: Record<string, boolean>;
    nextResult: PlannerResult;
}

interface UpdatedSessionMinutesResult {
    nextResult: PlannerResult;
    normalizedMinutes: number;
}

export function nextResultWithRows(
    previousResult: PlannerResult,
    rows: PlannerScheduleRow[],
): PlannerResult {
    return {
        created_at: new Date().toISOString(),
        schedule: sortRowsByDateAndSession(rows),
        summary: previousResult.summary ?? null,
    };
}

export function applyNextResult(
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

export function markSessionCompleted(
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

export function setBlockedDayBook(
    applyStateMutation: (mutation: AppStateMutation) => void,
    row: PlannerScheduleRow,
    blocked: boolean,
): void {
    applyStateMutation({
        blocked,
        key: dayBookCompletionKey(row.date, row.book_id),
        type: "set_blocked_day_book",
    });
}

export function finishScheduleUpdate(
    args: Pick<
        SharedUpdateArgs,
        "onScheduleRowsUpdated" | "queuePersist" | "setStatus"
    >,
    message: string,
): void {
    args.queuePersist();
    args.onScheduleRowsUpdated();
    args.setStatus(message);
}

function rowsWithoutRemovedSession(
    options: RemoveSessionArgs,
    previousRows: PlannerScheduleRow[],
): PlannerScheduleRow[] | null {
    const NEXT_ROWS = rowsWithoutSession(
        sessionKeyFor(options.row),
        previousRows,
    );
    if (NEXT_ROWS.length !== previousRows.length) {
        return NEXT_ROWS;
    }
    options.setStatus("Could not find that session to remove.", true);
    return null;
}

function removedSessionResult(
    options: RemoveSessionArgs,
    previousResult: PlannerResult,
    nextRows: PlannerScheduleRow[],
): RemovedSessionResult {
    return {
        nextCompletions: pruneScheduleCompletions(
            options.state.scheduleCompletions,
            nextRows,
        ),
        nextResult: nextResultWithRows(previousResult, nextRows),
    };
}

export function prepareRemovedSession(
    options: RemoveSessionArgs,
): RemovedSessionResult | null {
    const PREVIOUS_RESULT = options.state.lastResult ?? emptyPlannerResult();
    const NEXT_ROWS = rowsWithoutRemovedSession(
        options,
        PREVIOUS_RESULT.schedule,
    );
    if (NEXT_ROWS === null) {
        return null;
    }
    return removedSessionResult(options, PREVIOUS_RESULT, NEXT_ROWS);
}

export function finalizeRemovedSession(
    options: RemoveSessionArgs,
    result: RemovedSessionResult,
): void {
    options.applyStateMutation({
        scheduleCompletions: result.nextCompletions,
        type: "set_schedule_completions",
    });
    setBlockedDayBook(options.applyStateMutation, options.row, true);
    applyNextResult(options, result.nextResult);
    finishScheduleUpdate(
        options,
        `Removed session for "${options.row.title}" on ${options.row.date}.`,
    );
}

function updatedSessionRows(
    options: UpdateSessionMinutesArgs,
    previousRows: PlannerScheduleRow[],
) {
    const UPDATED_ROWS = nextRowsWithUpdatedMinutes({
        collectSettings: options.collectSettings,
        getBookById: options.getBookById,
        minutes: options.minutes,
        previousRows,
        row: options.row,
    });
    if (UPDATED_ROWS !== null) {
        return UPDATED_ROWS;
    }
    options.setStatus("Could not find that session to update.", true);
    return null;
}

function updatedSessionMinutesResult(
    previousResult: PlannerResult,
    updatedRows: NonNullable<ReturnType<typeof nextRowsWithUpdatedMinutes>>,
): UpdatedSessionMinutesResult {
    return {
        nextResult: nextResultWithRows(previousResult, updatedRows.rows),
        normalizedMinutes: updatedRows.normalizedMinutes,
    };
}

export function prepareUpdatedSessionMinutes(
    options: UpdateSessionMinutesArgs,
): UpdatedSessionMinutesResult | null {
    const PREVIOUS_RESULT = options.state.lastResult ?? emptyPlannerResult();
    const UPDATED_ROWS = updatedSessionRows(options, PREVIOUS_RESULT.schedule);
    if (UPDATED_ROWS === null) {
        return null;
    }
    return updatedSessionMinutesResult(PREVIOUS_RESULT, UPDATED_ROWS);
}

export function finalizeUpdatedSessionMinutes(
    options: UpdateSessionMinutesArgs,
    result: UpdatedSessionMinutesResult,
): void {
    applyNextResult(options, result.nextResult);
    finishScheduleUpdate(
        options,
        `Updated "${options.row.title}" to ${result.normalizedMinutes} planned minutes.`,
    );
}
