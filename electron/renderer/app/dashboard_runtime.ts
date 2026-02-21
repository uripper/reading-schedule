import type { Book } from "../books/types.js";
import { DEFAULT_PREFERENCES } from "./experience.js";
import type { AppRuntimeState } from "./runtime_state.js";

type DashboardRuntimeArgs = {
  applyPreferencesToDocument: (preferences: AppRuntimeState["preferences"]) => void;
  collectFeatureFlagsFromUI: () => Partial<AppRuntimeState["featureFlags"]>;
  collectPreferencesFromUI: () => Partial<AppRuntimeState["preferences"]>;
  collectAllBooks: () => Book[];
  normalizeFeatureFlags: (
    flags: Partial<AppRuntimeState["featureFlags"]>,
  ) => AppRuntimeState["featureFlags"];
  normalizePreferences: (
    preferences: Partial<AppRuntimeState["preferences"]>,
  ) => AppRuntimeState["preferences"];
  queuePersist: () => void;
  state: AppRuntimeState;
  updateStatsView: (payload: {
    books: Book[];
    sessions: AppRuntimeState["sessions"];
    lastResult: AppRuntimeState["lastResult"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    dailyGoalMinutes: number;
  }) => void;
  updateTodayDashboard: (payload: {
    books: Book[];
    defaultDailyGoalMinutes: number;
    featureFlags: AppRuntimeState["featureFlags"];
    lastResult: AppRuntimeState["lastResult"];
    preferences: AppRuntimeState["preferences"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    sessions: AppRuntimeState["sessions"];
  }) => void;
};

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
  applyExperienceSettings: () => void;
  updateDashboards: () => void;
} {
  const updateStatsDashboardView = () => {
    updateStatsView({
      books: collectAllBooks(),
      sessions: state.sessions,
      lastResult: state.lastResult,
      scheduleCompletions: state.scheduleCompletions,
      dailyGoalMinutes: Number(
        state.preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes,
      ),
    });
  };
  const updateDashboards = () => {
    updateTodayDashboard({
      lastResult: state.lastResult,
      scheduleCompletions: state.scheduleCompletions,
      books: collectAllBooks(),
      sessions: state.sessions,
      preferences: state.preferences,
      featureFlags: state.featureFlags,
      defaultDailyGoalMinutes: DEFAULT_PREFERENCES.dailyGoalMinutes,
    });
    updateStatsDashboardView();
  };
  const applyExperienceSettings = () => {
    state.preferences = normalizePreferences(collectPreferencesFromUI());
    state.featureFlags = normalizeFeatureFlags(collectFeatureFlagsFromUI());
    applyPreferencesToDocument(state.preferences);
    updateDashboards();
    queuePersist();
  };
  return { applyExperienceSettings, updateDashboards };
}
