import { applyPreferencesToDocument } from "../../accessibility/a11y.js";
import { fillBooks } from "../../books.js";
import { fillSettings } from "../../settings.js";
import { normalizeFeatureFlags, normalizePreferences } from "../experience/index.js";
import { fillPreferencesUI } from "../experience/index.js";
import { normalizeScheduleCompletions } from "../experience/index.js";
import { bindTodayActions, finalizeInitialLoad } from "./init_helpers.js";
import { loadInitialData } from "../load_state.js";
import type { AppBootstrapContext } from "../bootstrap_runtime.js";
import type { PlannerResult } from "../types.js";

interface LoadedResultController {
  applyLoadedResult(result: PlannerResult): void;
}

/**
 * Loads the initial state of the application, applying it to the provided context and controller,
 * and binds actions for the "Today" view.
 * @param context Application bootstrap context containing APIs and state management functions
 * @param planController Controller for applying the loaded planner result to the application state
 * @returns Promise that resolves when the initial load and bindings are complete
 */
export async function loadStateAndBindTodayActions(
  context: AppBootstrapContext,
  planController: LoadedResultController,
): Promise<void> {
  const { state } = context;
  const updateDashboards = context.dashboards.updateDashboards.bind(
    context.dashboards,
  );
  const setStatus = context.setStatus.bind(context);
  const queuePersist = context.queuePersist.bind(context);
  const queueAutoPlanIfReady = context.runtime.queueAutoPlanIfReady.bind(
    context.runtime,
  );
  const handleScheduleMutation = context.runtime.handleScheduleMutation.bind(
    context.runtime,
  );

  await loadInitialData({
    fillSettings,
    fillBooks,
    normalizePreferences,
    normalizeFeatureFlags,
    normalizeScheduleCompletions,
    fillPreferencesUI,
    applyPreferencesToDocument,
    setStatus,
    plannerApi: context.plannerApi,
    updateTodayView: updateDashboards,
    setPreferences: (preferences) => {
      state.preferences = preferences;
    },
    setFeatureFlags: (featureFlags) => {
      state.featureFlags = featureFlags;
    },
    setScheduleCompletions: (scheduleCompletions) => {
      state.scheduleCompletions = scheduleCompletions;
    },
    setSessions: (sessions) => {
      state.sessions = sessions;
    },
    applyLoadedResult: (result) => {
      if (result) {
        planController.applyLoadedResult(result);
      } else {
        state.lastResult = null;
      }
    },
    onLoaded: (saved) => {
      finalizeInitialLoad({
        saved,
        queuePersist,
        setStatus,
        setReady: () => {
          state.ready = true;
        },
        queueAutoPlan: queueAutoPlanIfReady,
      });
    },
  });

  bindTodayActions({
    getLastResult: () => state.lastResult,
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions) => {
      state.scheduleCompletions = nextCompletions;
    },
    getSessions: () => state.sessions,
    setSessions: (nextSessions) => {
      state.sessions = nextSessions;
    },
    updateTodayView: handleScheduleMutation,
    queuePersist,
    setStatus,
  });
}
