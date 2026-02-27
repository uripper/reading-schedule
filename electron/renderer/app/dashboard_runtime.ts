import type { Book } from "../books/types.js";
import { DEFAULT_PREFERENCES } from "./experience/index.js";
import type { AppRuntimeState } from "./runtime_state.js";

interface DashboardRuntimeArgs {
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

/**
 * Creates dashboard update actions that keep Today/Stats panels in sync with UI preferences.
 * @param root0 Runtime dependencies and mutable app state for dashboard updates.
 * @param root0.applyPreferencesToDocument Applies visual preference changes to the document root.
 * @param root0.collectFeatureFlagsFromUI Reads current feature flags from settings controls.
 * @param root0.collectPreferencesFromUI Reads current preference values from settings controls.
 * @param root0.collectAllBooks Returns all books currently present in the catalog.
 * @param root0.normalizeFeatureFlags Normalizes partial flag values into a complete feature flag object.
 * @param root0.normalizePreferences Normalizes partial preferences into a complete preferences object.
 * @param root0.queuePersist Schedules state persistence after preference/flag updates.
 * @param root0.state Shared mutable runtime state used by dashboard rendering.
 * @param root0.updateStatsView Renders the Stats dashboard from latest state values.
 * @param root0.updateTodayDashboard Renders the Today dashboard from latest state values.
 * @returns Dashboard action handlers for applying settings and repainting both dashboards.
 */
export function createDashboardRuntime({
  applyPreferencesToDocument,
  collectFeatureFlagsFromUI,
  collectPreferencesFromUI,
  collectAllBooks,
  normalizeFeatureFlags,
  normalizePreferences,
  queuePersist,
  state,
  updateStatsView,
  updateTodayDashboard,
}: DashboardRuntimeArgs): {
  applyExperienceSettings(): void;
  updateDashboards(): void;
} {
  const runtimeState = state;
  const updateStatsDashboardView = (): void => {
    updateStatsView({
      books: collectAllBooks(),
      sessions: runtimeState.sessions,
      lastResult: runtimeState.lastResult,
      scheduleCompletions: runtimeState.scheduleCompletions,
      dailyGoalMinutes: Number(runtimeState.preferences.dailyGoalMinutes),
    });
  };
  const updateDashboards = (): void => {
    updateTodayDashboard({
      lastResult: runtimeState.lastResult,
      scheduleCompletions: runtimeState.scheduleCompletions,
      books: collectAllBooks(),
      sessions: runtimeState.sessions,
      preferences: runtimeState.preferences,
      featureFlags: runtimeState.featureFlags,
      defaultDailyGoalMinutes: DEFAULT_PREFERENCES.dailyGoalMinutes,
    });
    updateStatsDashboardView();
  };
  const applyExperienceSettings = (): void => {
    runtimeState.preferences = normalizePreferences(collectPreferencesFromUI());
    runtimeState.featureFlags = normalizeFeatureFlags(collectFeatureFlagsFromUI());
    applyPreferencesToDocument(runtimeState.preferences);
    updateDashboards();
    queuePersist();
  };
  return { applyExperienceSettings, updateDashboards };
}
