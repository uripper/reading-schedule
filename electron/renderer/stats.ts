import type { Book } from "./books/types.js";
import type { Session } from "./sessions/normalize.js";
import { buildStatsSnapshot } from "./stats/model.js";
import { renderStatsDashboard } from "./stats/render.js";
import type { PlannerResult } from "./app/types.js";

interface UpdateStatsArgs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes: number;
}

/**
 *
 * @param root0
 * @param root0.books
 * @param root0.sessions
 * @param root0.lastResult
 * @param root0.scheduleCompletions
 * @param root0.dailyGoalMinutes
 */
export function updateStatsView({
  books,
  sessions,
  lastResult,
  scheduleCompletions,
  dailyGoalMinutes,
}: UpdateStatsArgs): void {
  const snapshot = buildStatsSnapshot({
    books,
    sessions,
    lastResult,
    scheduleCompletions,
    dailyGoalMinutes,
  });
  renderStatsDashboard(snapshot);
}
