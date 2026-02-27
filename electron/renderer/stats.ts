

import { buildStatsSnapshot } from "./stats/model.js";
import { renderStatsDashboard } from "./stats/render.js";

import type { UpdateStatsArgs } from "../types/app_runtime.js";

/**
 * Computes and renders the Stats dashboard from current runtime data.
 * @param root0 Stats input sources from runtime state.
 * @param root0.books Current book catalog.
 * @param root0.sessions Logged reading sessions.
 * @param root0.lastResult Latest planner result.
 * @param root0.scheduleCompletions Completion map keyed by schedule row.
 * @param root0.dailyGoalMinutes Daily goal minutes used for streak metrics.
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
