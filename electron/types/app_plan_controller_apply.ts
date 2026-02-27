import type { Session } from "./types_core.js";
import type {
  PlannerResult,
  PlannerScheduleRow,
  PlannerSummary,
} from "./types_planner.js";

export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

export interface ApplyPlannedDataArgs {
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

export interface ApplyLoadedResultArgs {
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
