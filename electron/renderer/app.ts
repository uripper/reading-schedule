import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { bindTabs } from "./tabs.js";
import { bindBooksUI, collectBooks, fillBooks, getBookById, setBookScheduleRows, updateBookProgress } from "./books.js";
import { configureCalendarInteractions, focusCalendarToday, renderCalendar } from "./calendar.js";
import { el } from "./dom.js";
import { addLog, bindHelpDialog } from "./help.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { bindExperienceSettings } from "./app/experience_bindings.js";
import {
  collectFeatureFlagsFromUI,
  collectPreferencesFromUI,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_PREFERENCES,
  fillPreferencesUI,
  normalizeFeatureFlags,
  normalizePreferences,
  normalizeScheduleCompletions,
} from "./app/experience.js";
import { configureAppCalendarInteractions } from "./app/calendar_interactions.js";
import { bindTodayActions, createAppPlanControllerInstance, createSessionsAppUI, finalizeInitialLoad, setupSkipLink } from "./app/init_helpers.js";
import { loadInitialData } from "./app/load_state.js";
import { createPersistQueue, createStatusSetter, totalsFromSummary } from "./app/runtime_helpers.js";
import type { PlannerApi, PlannerResult } from "./app/types.js";
import { updateTodayDashboard } from "./app/today.js";
const state: {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
} = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
};
const { plannerApi } = globalThis as typeof globalThis & { plannerApi: PlannerApi };
let sessionsUI: ReturnType<typeof createSessionsAppUI> | null = null;
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
  collectBooks,
  collectSettings,
  addLog,
  plannerApi,
  getSessionsUI: () => sessionsUI,
});
function updateTodayView() {
  updateTodayDashboard({
    sessionsUI,
    lastResult: state.lastResult,
    scheduleCompletions: state.scheduleCompletions,
    books: collectBooks(),
    preferences: state.preferences,
    featureFlags: state.featureFlags,
    defaultDailyGoalMinutes: DEFAULT_PREFERENCES.dailyGoalMinutes,
  });
}
function applyExperienceSettings() {
  state.preferences = normalizePreferences(collectPreferencesFromUI());
  state.featureFlags = normalizeFeatureFlags(collectFeatureFlagsFromUI());
  applyPreferencesToDocument(state.preferences);
  updateTodayView();
  queuePersist();
}
function queueAutoPlanIfReady() {
  if (state.ready && planController) {
    planController.queueAutoPlan();
  }
}
function handleTabChange(name: string) {
  if (name === "sessions" && sessionsUI) {
    sessionsUI.refreshBooks();
  }
  if (name === "schedule") {
    focusCalendarToday();
  }
}
function handleBooksChanged() {
  if (sessionsUI) {
    sessionsUI.refreshBooks();
  }
  updateTodayView();
  queuePersist();
  queueAutoPlanIfReady();
}
function handleSessionsChanged() {
  updateTodayView();
  queuePersist();
  queueAutoPlanIfReady();
}
function handleProgressUpdated() {
  updateTodayView();
  queueAutoPlanIfReady();
}
async function init() {
  setupSkipLink();
  initSettingsGrid();
  bindTabs(handleTabChange);
  bindBooksUI(handleBooksChanged);
  bindHelpDialog();
  sessionsUI = createSessionsAppUI({
    collectBooks,
    setStatus,
    onSessionsChanged: handleSessionsChanged,
    announce: announceForPlanController,
  });
  planController = createAppPlanControllerInstance({
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    updateTodayView,
    persistDraft,
    plannerApi,
    announce: announceForPlanController,
    getLastResult: () => state.lastResult,
    setLastResult: (nextResult: PlannerResult) => {
      state.lastResult = nextResult;
    },
    getSessions: () => sessionsUI?.getSessions() ?? [],
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      state.scheduleCompletions = nextCompletions;
    },
  });
  bindExperienceSettings(applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state,
    queuePersist,
    setStatus,
    updateBookProgress,
    getBookById,
    onSessionCompletionUpdated: updateTodayView,
    onProgressUpdated: handleProgressUpdated,
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
    updateTodayView,
    setStatus,
    setPreferences: (preferences) => { state.preferences = preferences; },
    setFeatureFlags: (featureFlags) => { state.featureFlags = featureFlags; },
    setScheduleCompletions: (scheduleCompletions) => { state.scheduleCompletions = scheduleCompletions; },
    setSessions: (sessions) => {
      sessionsUI?.setSessions(sessions);
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
        queueAutoPlan: queueAutoPlanIfReady,
      });
    },
  });
  bindTodayActions({
    getLastResult: () => state.lastResult,
    getScheduleCompletions: () => state.scheduleCompletions,
    getSessionsUI: () => sessionsUI,
  });
}
await init();
