import { applyPreferencesToDocument } from "../a11y.js";
import { fillBooks } from "../books.js";
import { fillSettings } from "../settings.js";
import {
  normalizeFeatureFlags,
  normalizePreferences,
} from "./experience.js";
import { fillPreferencesUI } from "./experience_fill_ui.js";
import { normalizeScheduleCompletions } from "./experience_schedule_completions.js";
import {
  bindTodayActions,
  finalizeInitialLoad,
} from "./init_helpers.js";
import { loadInitialData } from "./load_state.js";
import type { AppBootstrapContext } from "./bootstrap_runtime.js";
import type { PlannerResult } from "./types.js";

type LoadedResultController = {
  applyLoadedResult: (result: PlannerResult) => void;
};

export async function loadStateAndBindTodayActions(
  context: AppBootstrapContext,
  planController: LoadedResultController,
): Promise<void> {
  await loadInitialData({
    plannerApi: context.plannerApi,
    fillSettings,
    fillBooks,
    normalizePreferences,
    normalizeFeatureFlags,
    normalizeScheduleCompletions,
    fillPreferencesUI,
    applyPreferencesToDocument,
    setStatus: context.setStatus,
    updateTodayView: context.dashboards.updateDashboards,
    setPreferences: (preferences) => {
      context.state.preferences = preferences;
    },
    setFeatureFlags: (featureFlags) => {
      context.state.featureFlags = featureFlags;
    },
    setScheduleCompletions: (scheduleCompletions) => {
      context.state.scheduleCompletions = scheduleCompletions;
    },
    setSessions: (sessions) => {
      context.state.sessions = sessions;
    },
    applyLoadedResult: (result) => {
      planController.applyLoadedResult(result);
    },
    onLoaded: (saved) => {
      finalizeInitialLoad({
        saved,
        queuePersist: context.queuePersist,
        setStatus: context.setStatus,
        setReady: () => {
          context.state.ready = true;
        },
        queueAutoPlan: context.runtime.queueAutoPlanIfReady,
      });
    },
  });

  bindTodayActions({
    getLastResult: () => context.state.lastResult,
    getScheduleCompletions: () => context.state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions) => {
      context.state.scheduleCompletions = nextCompletions;
    },
    getSessions: () => context.state.sessions,
    setSessions: (nextSessions) => {
      context.state.sessions = nextSessions;
    },
    updateTodayView: context.runtime.handleScheduleMutation,
    queuePersist: context.queuePersist,
    setStatus: context.setStatus,
  });
}
