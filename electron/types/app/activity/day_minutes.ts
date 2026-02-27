import type { Session } from "../../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../../types.js";

export type DayMinutesMap = Map<string, number>;

export interface DayMinutesArgs {
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  year: number | null;
}
