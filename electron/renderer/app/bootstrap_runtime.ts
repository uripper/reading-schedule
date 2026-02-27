import { applyPreferencesToDocument, createAnnouncer } from "../accessibility/index.js";
import { collectAllBooks } from "../books.js";
import { focusCalendarToday } from "../calendar.js";
import { el } from "../dom.js";
import { addLog } from "../help.js";
import { collectSettings } from "../settings.js";
import { updateStatsView } from "../stats.js";
import { collectFeatureFlagsFromUI, collectPreferencesFromUI, normalizeFeatureFlags, normalizePreferences } from "./experience/index.js";
import { createDashboardRuntime } from "./dashboard_runtime.js";
import { createInitRuntime } from "./init/index.js";
import { createPersistQueue, createStatusSetter } from "./runtime_helpers.js";
import { createRuntimeState } from "./runtime_state.js";
import { updateTodayDashboard } from "./today/index.js";
import type { PlannerApi } from "../../types/types.js";
import type { AppBootstrapContext } from "../../types/app_bootstrap_runtime.js";
export type { AppBootstrapContext };

/**
 * Retrieves the Planner API from the global context. This function assumes that the `plannerApi`
 * has been exposed on the global object, which is typically done in the preload script of an Electron
 * application.
 * @returns The Planner API instance available on the global context
 */
function plannerApiFromGlobal(): PlannerApi {
  const globals = globalThis as typeof globalThis & { plannerApi: PlannerApi };
  return globals.plannerApi;
}

/**
 * Creates and initializes the application bootstrap context, which includes state management, API access,
 * and utility functions for the application. This context is used throughout the application to manage state,
 * interact with the Planner API, and perform various actions related to the application's functionality.
 * @returns An initialized AppBootstrapContext object containing APIs, state, and utility functions
 */
export function createAppBootstrapContext(): AppBootstrapContext {
  const state = createRuntimeState();
  const plannerApi = plannerApiFromGlobal();
  const announce = createAnnouncer();
  const announceForPlanController = (
    message: string,
    politeness?: string,
  ): void => {
    if (politeness === "polite" || politeness === "assertive") {
      announce(message, politeness);
      return;
    }
    announce(message);
  };
  const setStatus = createStatusSetter(el("status"), addLog);
  const persistQueue = createPersistQueue({
    state,
    collectSettings,
    addLog,
    plannerApi,
    collectBooks: collectAllBooks,
    getSessions: () => state.sessions,
  });
  const queuePersist = (): void => {
    persistQueue.queuePersist();
  };
  const persistDraft = async (): Promise<boolean> => {
    return await persistQueue.persistDraft();
  };
  const dashboards = createDashboardRuntime({
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
  });
  const runtime = createInitRuntime({
    focusCalendarToday,
    queuePersist,
    state,
    updateDashboards: (): void => {
      dashboards.updateDashboards();
    },
  });

  return {
    announce,
    announceForPlanController,
    dashboards,
    plannerApi,
    persistDraft,
    queuePersist,
    runtime,
    setStatus,
    state,
  };
}
