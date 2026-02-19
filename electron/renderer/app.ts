import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { bindTabs } from "./tabs.js";
import { bindBooksUI, collectAllBooks, collectBooks, fillBooks, getBookById, setBookScheduleRows, updateBookProgress } from "./books.js";
import { configureCalendarInteractions, focusCalendarToday, renderCalendar } from "./calendar.js";
import { el } from "./dom.js";
import { addLog, bindHelpDialog } from "./help.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { updateStatsView } from "./stats.js";
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
import { bindTodayActions, createAppPlanControllerInstance, finalizeInitialLoad, setupSkipLink } from "./app/init_helpers.js";
import { loadInitialData } from "./app/load_state.js";
import { createPersistQueue, createStatusSetter, totalsFromSummary } from "./app/runtime_helpers.js";
import type { PlannerApi, PlannerResult } from "./app/types.js";
import { updateTodayDashboard } from "./app/today.js";
import type { Session } from "./sessions/normalize.js";
import { minutesForDay, streakFromSessions, todayKey } from "./sessions/utils.js";
const state: {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  sessions: Session[];
} = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
  sessions: [],
};
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
  getSessionsUI: () => ({ getSessions: () => state.sessions }),
});
function sessionSummary() {
  return {
    todayMinutes: () => minutesForDay(state.sessions, todayKey()),
    streakDays: () => streakFromSessions(state.sessions),
  };
}
function updateTodayView() {
  updateTodayDashboard({
    sessionsUI: sessionSummary(),
    lastResult: state.lastResult,
    scheduleCompletions: state.scheduleCompletions,
    books: collectAllBooks(),
    preferences: state.preferences,
    featureFlags: state.featureFlags,
    defaultDailyGoalMinutes: DEFAULT_PREFERENCES.dailyGoalMinutes,
  });
}
function updateStatsDashboardView() {
  updateStatsView({
    books: collectAllBooks(),
    sessions: state.sessions,
    lastResult: state.lastResult,
    scheduleCompletions: state.scheduleCompletions,
  });
}
function updateDashboards() {
  updateTodayView();
  updateStatsDashboardView();
}
function applyExperienceSettings() {
  state.preferences = normalizePreferences(collectPreferencesFromUI());
  state.featureFlags = normalizeFeatureFlags(collectFeatureFlagsFromUI());
  applyPreferencesToDocument(state.preferences);
  updateDashboards();
  queuePersist();
}
function queueAutoPlanIfReady() {
  if (state.ready && planController) {
    planController.queueAutoPlan();
  }
}
function handleTabChange(name: string) {
  if (name === "schedule") {
    focusCalendarToday();
  }
}
function handleBooksChanged() {
  updateDashboards();
  queuePersist();
  queueAutoPlanIfReady();
}
function handleProgressUpdated() {
  updateDashboards();
  queueAutoPlanIfReady();
}
async function init() {
  setupSkipLink();
  initSettingsGrid();
  bindTabs(handleTabChange);
  bindBooksUI(handleBooksChanged);
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
    updateTodayView: updateDashboards,
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
  bindExperienceSettings(applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state,
    queuePersist,
    setStatus,
    updateBookProgress,
    getBookById,
    onSessionCompletionUpdated: updateDashboards,
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
    setStatus,
    updateTodayView: updateDashboards,
    setPreferences: (preferences) => { state.preferences = preferences; },
    setFeatureFlags: (featureFlags) => { state.featureFlags = featureFlags; },
    setScheduleCompletions: (scheduleCompletions) => { state.scheduleCompletions = scheduleCompletions; },
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
        queueAutoPlan: queueAutoPlanIfReady,
      });
    },
  });
  bindTodayActions();
}
await init();
