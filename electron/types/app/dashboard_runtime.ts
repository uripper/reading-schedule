import type { AppRuntimeState } from "../../renderer/app/runtime_state.js";
import type { Book } from "../../renderer/books/types.js";

export interface DashboardRuntimeArgs {
  applyPreferencesToDocument(
    this: void,
    preferences: AppRuntimeState["preferences"],
  ): void;
  collectFeatureFlagsFromUI(this: void): Partial<AppRuntimeState["featureFlags"]>;
  collectPreferencesFromUI(this: void): Partial<AppRuntimeState["preferences"]>;
  collectAllBooks(this: void): Book[];
  normalizeFeatureFlags(
    this: void,
    flags: Partial<AppRuntimeState["featureFlags"]>,
  ): AppRuntimeState["featureFlags"];
  normalizePreferences(
    this: void,
    preferences: Partial<AppRuntimeState["preferences"]>,
  ): AppRuntimeState["preferences"];
  queuePersist(this: void): void;
  state: AppRuntimeState;
  updateStatsView(this: void, payload: {
    books: Book[];
    sessions: AppRuntimeState["sessions"];
    lastResult: AppRuntimeState["lastResult"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    dailyGoalMinutes: number;
  }): void;
  updateTodayDashboard(this: void, payload: {
    books: Book[];
    defaultDailyGoalMinutes: number;
    featureFlags: AppRuntimeState["featureFlags"];
    lastResult: AppRuntimeState["lastResult"];
    preferences: AppRuntimeState["preferences"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    sessions: AppRuntimeState["sessions"];
  }): void;
}
