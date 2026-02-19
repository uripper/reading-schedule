import type { Book } from "./books/types.js";
import type { Session } from "./sessions/normalize.js";
import { buildStatsSnapshot } from "./stats/model.js";
import { renderStatsDashboard } from "./stats/render.js";
import type { PlannerResult } from "./app/types.js";

type UpdateStatsArgs = {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
};

export function updateStatsView({
  books,
  sessions,
  lastResult,
  scheduleCompletions,
}: UpdateStatsArgs): void {
  const snapshot = buildStatsSnapshot({
    books,
    sessions,
    lastResult,
    scheduleCompletions,
  });
  renderStatsDashboard(snapshot);
}
