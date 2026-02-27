import type { FeatureFlags, Preferences } from "../../../renderer/app/experience/index.js";
import type { Book } from "../../../renderer/books/types.js";
import type { Session } from "../../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../../types.js";

export interface UpdateTodayDashboardArgs {
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  books: Book[];
  sessions: Session[];
  preferences: Preferences;
  featureFlags: FeatureFlags;
  defaultDailyGoalMinutes: number;
}
