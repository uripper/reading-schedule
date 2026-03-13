import type { UpdateStatsArgs } from "../types/types.ts";
import { buildStatsSnapshot } from "./stats/model.ts";
import { renderStatsDashboard } from "./stats/render.ts";

/**
 * Computes and renders the Stats dashboard from current runtime data.
 * @param root0 - Stats input sources from runtime state.
 * @param books - Current book catalog.
 * @param sessions - Logged reading sessions.
 * @param lastResult - Latest planner result.
 * @param scheduleCompletions - Completion map keyed by schedule row.
 * @param dailyGoalMinutes - Daily goal minutes used for streak metrics.
 */
export function updateStatsView({
    books,
    sessions,
    lastResult,
    scheduleCompletions,
    dailyGoalMinutes,
}: UpdateStatsArgs): void {
    const SNAPSHOT = buildStatsSnapshot({
        books,
        dailyGoalMinutes,
        lastResult,
        scheduleCompletions,
        sessions,
    });
    renderStatsDashboard(SNAPSHOT);
}
