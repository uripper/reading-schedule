import type { Session } from "../sessions/normalize.js";
import {
  mergeScheduleRows,
  pruneScheduleCompletions,
} from "./schedule_preserve.js";
import type {
  PlannerResult,
  PlannerScheduleRow,
  PlannerSummary,
} from "./types.js";

export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

interface ApplyPlannedDataArgs {
  data: PlannerRunData;
  preserveLockedDays: boolean;
  getLastResult(this: void): PlannerResult | null;
  getSessions(this: void): Session[];
  getBlockedDayBooks(this: void): Record<string, boolean>;
  getScheduleCompletions(this: void): Record<string, boolean>;
  setScheduleCompletions(
    this: void,
    completions: Record<string, boolean>,
  ): void;
  setLastResult(this: void, result: PlannerResult): void;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(this: void, summary: PlannerSummary | null): Record<string, number>;
  updateTodayView(this: void): void;
  persistDraft(this: void): Promise<boolean>;
}

interface ApplyLoadedResultArgs {
  savedResult: PlannerResult | null;
  defaultLastResult: PlannerResult;
  setLastResult(this: void, result: PlannerResult): void;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(this: void, summary: PlannerSummary | null): Record<string, number>;
  addLog(this: void, message: string): void;
}

/**
 * Checks whether a schedule contains at least one row.
 * @param rows Candidate schedule rows.
 * @returns True when one or more rows exist.
 */
function hasRows(rows: PlannerScheduleRow[]): boolean {
  return rows.length > 0;
}

/**
 * Creates a timestamped planner result from generated schedule data.
 * @param data Planner generation result payload.
 * @returns Persistable planner result object.
 */
function resultFromData(data: PlannerRunData): PlannerResult {
  return {
    schedule: data.schedule,
    summary: data.summary ?? null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Applies generated schedule data into runtime state and persists it.
 * @param root0 Planner data and runtime dependencies.
 * @param root0.data Generated schedule and summary payload.
 * @param root0.preserveLockedDays Whether existing manual locks should be preserved.
 * @returns Promise that resolves after state persistence completes.
 */
export async function applyPlannedData(root0: ApplyPlannedDataArgs): Promise<void> {
  const {
    data,
    preserveLockedDays,
    getLastResult,
    getSessions,
    getBlockedDayBooks,
    getScheduleCompletions,
    setScheduleCompletions,
    setLastResult,
    setBookScheduleRows,
    renderCalendar,
    totalsFromSummary,
    updateTodayView,
    persistDraft,
  } = root0;
  const previousRows = getLastResult()?.schedule ?? [];
  let nextRows = data.schedule;
  if (preserveLockedDays) {
    nextRows = mergeScheduleRows(
      previousRows,
      nextRows,
      getSessions(),
      getBlockedDayBooks(),
    );
  }
  const filteredCompletions = pruneScheduleCompletions(
    getScheduleCompletions(),
    nextRows,
  );
  setScheduleCompletions(filteredCompletions);
  const nextResult = resultFromData({ ...data, schedule: nextRows });
  setLastResult(nextResult);
  setBookScheduleRows(nextRows);
  renderCalendar(nextRows, totalsFromSummary(nextResult.summary));
  updateTodayView();
  await persistDraft();
}

/**
 * Applies a saved planner result into runtime state and calendar UI.
 * @param root0 Saved result payload and update callbacks.
 * @param root0.savedResult Persisted planner result to apply.
 * @param root0.defaultLastResult Fallback empty planner result.
 */
export function applyLoadedResult(root0: ApplyLoadedResultArgs): void {
  const {
    savedResult,
    defaultLastResult,
    setLastResult,
    setBookScheduleRows,
    renderCalendar,
    totalsFromSummary,
    addLog,
  } = root0;
  if (savedResult === null || !hasRows(savedResult.schedule)) {
    setLastResult(defaultLastResult);
    setBookScheduleRows([]);
    return;
  }
  setLastResult(savedResult);
  setBookScheduleRows(savedResult.schedule);
  renderCalendar(
    savedResult.schedule,
    totalsFromSummary(savedResult.summary),
  );
  addLog("Loaded previous schedule.");
}
