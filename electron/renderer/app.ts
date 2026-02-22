import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import {
  bindBooksUI,
  collectAllBooks,
  collectBooks,
  fillBooks,
  getBookById,
  setBookScheduleRows,
  updateBookProgress,
} from "./books.js";
import {
  configureCalendarInteractions,
  focusCalendarToday,
  renderCalendar,
} from "./calendar.js";
import { bindDesktopShortcuts } from "./desktop_shortcuts.js";
import { el } from "./dom.js";
import { addLog, bindHelpDialog } from "./help.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { updateStatsView } from "./stats.js";
import { bindTabs } from "./tabs.js";
import { bindExperienceSettings } from "./app/experience_bindings.js";
import {
  collectFeatureFlagsFromUI,
  collectPreferencesFromUI,
  fillPreferencesUI,
  normalizeFeatureFlags,
  normalizePreferences,
  normalizeScheduleCompletions,
} from "./app/experience.js";
import { configureAppCalendarInteractions } from "./app/calendar_interactions.js";
import { createDashboardRuntime } from "./app/dashboard_runtime.js";
import {
  bindTodayActions,
  createAppPlanControllerInstance,
  finalizeInitialLoad,
  setupSkipLink,
} from "./app/init_helpers.js";
import { createInitRuntime } from "./app/init_runtime.js";
import { loadInitialData } from "./app/load_state.js";
import { createPersistQueue, createStatusSetter, totalsFromSummary } from "./app/runtime_helpers.js";
import { createRuntimeState } from "./app/runtime_state.js";
import { createSplashController } from "./app/splash.js";
import type { PlannerApi, PlannerResult } from "./app/types.js";
import { updateTodayDashboard } from "./app/today.js";

const state = createRuntimeState();
const { plannerApi } = globalThis as typeof globalThis & { plannerApi: PlannerApi };
let planController: ReturnType<typeof createAppPlanControllerInstance> | null = null;
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

async function init() {
  setupSkipLink();
  bindDesktopShortcuts({ plannerApi, announce });
  initSettingsGrid();
  bindTabs(runtime.handleTabChange);
  bindBooksUI(runtime.handleBooksChanged);
  bindHelpDialog();
  planController = createAppPlanControllerInstance({
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    persistDraft,
    plannerApi,
    updateTodayView: dashboards.updateDashboards,
    announce: announceForPlanController,
    getLastResult: () => state.lastResult,
    setLastResult: (nextResult: PlannerResult) => {
      state.lastResult = nextResult;
    },
    getSessions: () => state.sessions,
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      state.scheduleCompletions = nextCompletions;
    },
  });
  runtime.setPlanController(planController);
  bindExperienceSettings(dashboards.applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state,
    queuePersist,
    setStatus,
    collectSettings,
    collectAllBooks,
    setBookScheduleRows,
    renderCalendar,
    totalsFromSummary,
    updateBookProgress,
    getBookById,
    setLastResult: (nextResult: PlannerResult) => {
      state.lastResult = nextResult;
    },
    onSessionCompletionUpdated: runtime.handleScheduleMutation,
    onProgressUpdated: runtime.handleScheduleMutation,
    onScheduleRowsUpdated: dashboards.updateDashboards,
  });
  await loadInitialData({
    plannerApi,
    fillSettings,
    fillBooks,
    normalizePreferences,
    normalizeFeatureFlags,
    normalizeScheduleCompletions,
    fillPreferencesUI,
    applyPreferencesToDocument,
    setStatus,
    updateTodayView: dashboards.updateDashboards,
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
      planController?.applyLoadedResult(result);
    },
    onLoaded: (saved) => {
      finalizeInitialLoad({
        saved,
        queuePersist,
        setStatus,
        setReady: () => {
          state.ready = true;
        },
        queueAutoPlan: runtime.queueAutoPlanIfReady,
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
    updateTodayView: runtime.handleScheduleMutation,
    queuePersist,
    setStatus,
  });
}

const splash = createSplashController();
await init();
splash.completeWhenReady();
