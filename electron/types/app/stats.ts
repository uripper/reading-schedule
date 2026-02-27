import type { Book } from "../../renderer/books/types.js";
import type { Session } from "../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../types.js";

export interface UpdateStatsArgs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes: number;
}
