import type {
    ApplyLoadedResultArgs,
    ApplyPlannedDataArgs,
    PlannerResult,
    PlannerRunData,
    PlannerScheduleRow,
} from "../../types/types.ts";
import {
    mergeScheduleRows,
    pruneScheduleCompletions,
} from "./schedule_preserve.ts";

/**
 * Checks whether a schedule contains at least one row.
 * @param rows - Candidate schedule rows.
 * @returns True when one or more rows exist.
 */
function hasRows(rows: PlannerScheduleRow[]): boolean {
    return rows.length > 0;
}

/**
 * Creates a timestamped planner result from generated schedule data.
 * @param data - Planner generation result payload.
 * @returns Persistable planner result object.
 */
function resultFromData(data: PlannerRunData): PlannerResult {
    return {
        created_at: new Date().toISOString(),
        schedule: data.schedule,
        summary: data.summary ?? null,
    };
}

/**
 * Applies generated schedule data into runtime state and persists it.
 * @param args - Planner data and runtime dependencies.
 * @returns Promise that resolves after state persistence completes.
 */
export async function applyPlannedData(
    args: ApplyPlannedDataArgs,
): Promise<void> {
    const NEXT_ROWS = plannedScheduleRows(args);
    const FILTERED_COMPLETIONS = pruneScheduleCompletions(
        args.getScheduleCompletions(),
        NEXT_ROWS,
    );
    args.setScheduleCompletions(FILTERED_COMPLETIONS);
    applyPlannedRows(args, NEXT_ROWS);
    await args.persistDraft();
}

function plannedScheduleRows(args: ApplyPlannedDataArgs): PlannerScheduleRow[] {
    const PREVIOUS_ROWS = args.getLastResult()?.schedule ?? [];
    return mergeScheduleRows({
        blockedDayBooks: args.getBlockedDayBooks(),
        nextRows: args.data.schedule,
        preservationMode: args.preservationMode,
        previousRows: PREVIOUS_ROWS,
        scheduleCompletions: args.getScheduleCompletions(),
    });
}

function applyPlannedRows(
    args: ApplyPlannedDataArgs,
    nextRows: PlannerScheduleRow[],
): void {
    const NEXT_RESULT = resultFromData({ ...args.data, schedule: nextRows });
    args.setLastResult(NEXT_RESULT);
    args.setBookScheduleRows(nextRows);
    args.renderCalendar(nextRows, args.totalsFromSummary(NEXT_RESULT.summary));
    args.updateTodayView();
}

/**
 * Applies a saved planner result into runtime state and calendar UI.
 * @param args - Saved result payload and update callbacks.
 */
export function applyLoadedResult(args: ApplyLoadedResultArgs): void {
    const SAVED_RESULT = args.savedResult;
    if (SAVED_RESULT === null || !hasRows(SAVED_RESULT.schedule)) {
        args.setLastResult(args.defaultLastResult);
        args.setBookScheduleRows([]);
        return;
    }
    args.setLastResult(SAVED_RESULT);
    args.setBookScheduleRows(SAVED_RESULT.schedule);
    args.renderCalendar(
        SAVED_RESULT.schedule,
        args.totalsFromSummary(SAVED_RESULT.summary),
    );
    args.addLog("Loaded previous schedule.");
}
