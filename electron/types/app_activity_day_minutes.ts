import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";

export type DayMinutesMap = Map<string, number>;

export interface DayMinutesArgs {
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  year: number | null;
}
