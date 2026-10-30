/** Applies sync-session schedule changes and rolls back only the imported sessions. */
import type {
    AppRuntimeState,
    PlannerScheduleRow,
    SyncSessionState,
} from "@reading-schedule/contracts";
import { nextResultWithRows } from "../app/calendar_interactions/calendar-interactions-schedule-update-helpers.ts";
import { applyAppStateMutation } from "../app/state_mutations.ts";
import { dayBookCompletionKey, sessionKeyFor } from "../calendar/utils.ts";

/** Captures immutable field references before adding optional synced sessions. */
export function syncSessionSnapshot(state: AppRuntimeState): SyncSessionState {
    return {
        blockedDayBooks: state.blockedDayBooks,
        lastResult: state.lastResult,
        scheduleCompletions: state.scheduleCompletions,
    };
}

/** Updates canonical schedule state and its completion indexes together. */
export function applySyncSessionState(
    state: AppRuntimeState,
    snapshot: SyncSessionState,
): void {
    applyAppStateMutation(state, {
        lastResult: snapshot.lastResult,
        type: "set_last_result",
    });
    applyAppStateMutation(state, {
        scheduleCompletions: snapshot.scheduleCompletions,
        type: "set_schedule_completions",
    });
    applyAppStateMutation(state, {
        blockedDayBooks: snapshot.blockedDayBooks,
        type: "set_blocked_day_books",
    });
}

/** Removes only this import's rows, preserving schedule edits made while saving. */
function restoredResult(
    current: SyncSessionState,
    before: SyncSessionState,
    rows: readonly PlannerScheduleRow[],
) {
    const KEYS = new Set(rows.map(sessionKeyFor));
    const RESULT = current.lastResult;
    if (RESULT === null) {
        return null;
    }
    const REMAINING = RESULT.schedule.filter(
        (row) => !KEYS.has(sessionKeyFor(row)),
    );
    if (
        REMAINING.every(
            (row, index) => row === before.lastResult?.schedule[index],
        ) &&
        REMAINING.length === (before.lastResult?.schedule.length ?? 0)
    ) {
        return before.lastResult;
    }
    return nextResultWithRows(RESULT, REMAINING);
}

/** Restores a changed flag without discarding unrelated keys. */
function restoreFlag(
    flags: Record<string, boolean>,
    before: Record<string, boolean>,
    key: string,
): void {
    const FLAGS = flags;
    const PREVIOUS = before[key];
    if (PREVIOUS !== undefined) {
        FLAGS[key] = PREVIOUS;
        return;
    }
    delete FLAGS[key];
}

/** Keeps a day/book complete if another completed session was added concurrently. */
function hasCompletedBookDay(
    state: SyncSessionState,
    row: PlannerScheduleRow,
): boolean {
    return (state.lastResult?.schedule ?? []).some(
        (remaining) =>
            remaining.date === row.date &&
            remaining.book_id === row.book_id &&
            state.scheduleCompletions[sessionKeyFor(remaining)] === true,
    );
}

/** Restores flags for removed import rows while retaining concurrent reading activity. */
export function rollbackSyncSessions(
    state: AppRuntimeState,
    before: SyncSessionState,
    rows: readonly PlannerScheduleRow[],
): void {
    const NEXT = {
        ...syncSessionSnapshot(state),
        blockedDayBooks: { ...state.blockedDayBooks },
        lastResult: restoredResult(state, before, rows),
        scheduleCompletions: { ...state.scheduleCompletions },
    };
    for (const ROW of rows) {
        restoreFlag(
            NEXT.scheduleCompletions,
            before.scheduleCompletions,
            sessionKeyFor(ROW),
        );
        if (!hasCompletedBookDay(NEXT, ROW)) {
            const KEY = dayBookCompletionKey(ROW.date, ROW.book_id);
            restoreFlag(
                NEXT.scheduleCompletions,
                before.scheduleCompletions,
                KEY,
            );
            restoreFlag(NEXT.blockedDayBooks, before.blockedDayBooks, KEY);
        }
    }
    applySyncSessionState(state, NEXT);
}
