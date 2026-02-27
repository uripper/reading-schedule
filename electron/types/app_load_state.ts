import type { Book } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerApi } from "./planner_state.js";
import type { PlannerResult } from "./planner_result.js";
import type { LoadedPlannerState } from "./planner_state.js";
import type { PlannerSettings } from "./planner_state.js";
import type { FeatureFlags, Preferences } from "./app_experience.js";

export interface InitialDataSource {
  settings?: PlannerSettings;
  books?: Book[];
}

export interface LoadStateArgs {
  plannerApi: Pick<PlannerApi, "loadState" | "sample">;
  fillSettings(settings?: PlannerSettings): void;
  fillBooks(books?: Book[]): void;
  normalizePreferences(raw: Partial<Preferences>): Preferences;
  normalizeFeatureFlags(raw: Partial<FeatureFlags>): FeatureFlags;
  normalizeScheduleCompletions(
    raw: Record<string, boolean>,
  ): Record<string, boolean>;
  fillPreferencesUI(preferences: Preferences, featureFlags: FeatureFlags): void;
  applyPreferencesToDocument(preferences: Preferences): void;
  setPreferences(preferences: Preferences): void;
  setFeatureFlags(featureFlags: FeatureFlags): void;
  setScheduleCompletions(scheduleCompletions: Record<string, boolean>): void;
  setBlockedDayBooks(blockedDayBooks: Record<string, boolean>): void;
  setSessions(sessions: Session[]): void;
  applyLoadedResult(result: PlannerResult | null): void;
  updateTodayView(): void;
  onLoaded(saved: LoadedPlannerState | null | undefined): void;
  setStatus(message: string, isError?: boolean): void;
}
