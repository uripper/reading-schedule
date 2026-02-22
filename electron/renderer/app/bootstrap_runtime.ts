import { applyPreferencesToDocument, createAnnouncer } from "../a11y.js";
import { collectAllBooks } from "../books.js";
import { focusCalendarToday } from "../calendar.js";
import { el } from "../dom.js";
import { addLog } from "../help.js";
import { collectSettings } from "../settings.js";
import { updateStatsView } from "../stats.js";
import {
  collectFeatureFlagsFromUI,
  collectPreferencesFromUI,
} from "./experience_ui.js";
import {
  normalizeFeatureFlags,
  normalizePreferences,
} from "./experience.js";
import { createDashboardRuntime } from "./dashboard_runtime.js";
import { createInitRuntime } from "./init_runtime.js";
import { createPersistQueue, createStatusSetter } from "./runtime_helpers.js";
import { createRuntimeState } from "./runtime_state.js";
import { updateTodayDashboard } from "./today.js";
import type { PlannerApi } from "./types.js";

export type AppBootstrapContext = {
  announce: ReturnType<typeof createAnnouncer>;
  announceForPlanController: (message: string, politeness?: string) => void;
  dashboards: ReturnType<typeof createDashboardRuntime>;
  plannerApi: PlannerApi;
  persistDraft: () => Promise<boolean>;
  queuePersist: () => void;
  runtime: ReturnType<typeof createInitRuntime>;
  setStatus: (message: string, isError?: boolean) => void;
  state: ReturnType<typeof createRuntimeState>;
};

function plannerApiFromGlobal(): PlannerApi {
  const globals = globalThis as typeof globalThis & { plannerApi: PlannerApi };
  return globals.plannerApi;
}

export function createAppBootstrapContext(): AppBootstrapContext {
  const state = createRuntimeState();
  const plannerApi = plannerApiFromGlobal();
  const announce = createAnnouncer();
  const announceForPlanController = (message: string, politeness?: string) => {
    if (politeness === "polite" || politeness === "assertive") {
      announce(message, politeness);
      return;
    }
    announce(message);
  };
  const setStatus = createStatusSetter(el("status"), addLog);
  const { persistDraft, queuePersist } = createPersistQueue({
    state,
    collectSettings,
    addLog,
    plannerApi,
    collectBooks: collectAllBooks,
    getSessions: () => state.sessions,
  });
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
    updateDashboards: dashboards.updateDashboards,
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
