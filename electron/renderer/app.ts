import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { activateTab, bindTabs } from "./tabs.js";
import { bindBooksUI, collectBooks, fillBooks, getBookById, setBookScheduleRows, updateBookProgress } from "./books.js";
import { configureCalendarInteractions, focusCalendarToday, renderCalendar } from "./calendar.js";
import { el } from "./dom.js";
import { addLog, bindHelpDialog } from "./help.js";
import { initSessionsUI } from "./sessions.js";
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
import { createPlanController } from "./app/plan_controller.js";
import { bindSettingsAutoPlanListeners, createPersistQueue, createStatusSetter, totalsFromSummary } from "./app/runtime_helpers.js";
import type { PlannerApi } from "./app/types.js";
import { activateSessionsAndStartTimer, updateTodayDashboard } from "./app/today.js";
const state: {
  lastResult: unknown | null;
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
let sessionsUI: ReturnType<typeof initSessionsUI> | null = null;
let planController: ReturnType<typeof createPlanController> | null = null;
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

function setupSkipLink() {
  const skipLink = document.querySelector(".skip-link");
  if (skipLink) {
    skipLink.addEventListener("click", (event) => {
      event.preventDefault();
      el("mainContent").focus();
    });
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

function createSessionsAppUI() {
  return initSessionsUI({
    getBooks: collectBooks,
    initialSessions: [],
    onSessionsChanged: handleSessionsChanged,
    announce: announceForPlanController,
    setStatus,
  });
}

function createAppPlanControllerInstance() {
  return createPlanController({
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
    setLastResult: (nextResult: unknown) => {
      state.lastResult = nextResult;
    },
    getSessions: () => sessionsUI?.getSessions() ?? [],
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      state.scheduleCompletions = nextCompletions;
    },
  });
}

type InitialDataSource =
  | {
      settings?: Parameters<typeof fillSettings>[0];
      books?: Parameters<typeof fillBooks>[0];
    }
  | null
  | undefined;

type LoadedPlannerState =
  | (InitialDataSource & {
      preferences?: Record<string, unknown>;
      feature_flags?: Record<string, unknown>;
      schedule_completions?: Record<string, boolean>;
      sessions?: unknown[];
      last_result?: { schedule?: unknown[] } | null;
    })
  | null
  | undefined;

function hasInitialSettingsAndBooks(source: InitialDataSource): boolean {
  return Boolean(source?.settings && source?.books);
}

async function resolveInitialSource(saved: LoadedPlannerState): Promise<InitialDataSource> {
  if (hasInitialSettingsAndBooks(saved)) {
    return saved;
  }
  return (await plannerApi.sample()) as InitialDataSource;
}

function applyLoadedState(saved: LoadedPlannerState, source: InitialDataSource) {
  fillSettings(source?.settings);
  fillBooks(source?.books);
  state.preferences = normalizePreferences(saved?.preferences || {});
  state.featureFlags = normalizeFeatureFlags(saved?.feature_flags || {});
  state.scheduleCompletions = normalizeScheduleCompletions(saved?.schedule_completions || {});
  fillPreferencesUI(state.preferences, state.featureFlags);
  applyPreferencesToDocument(state.preferences);
  sessionsUI?.setSessions(saved?.sessions || []);
  planController?.applyLoadedResult(saved?.last_result || null);
  updateTodayView();
}

function finalizeInitialLoad(saved: LoadedPlannerState) {
  state.ready = true;
  document.addEventListener("input", queuePersist);
  document.addEventListener("change", queuePersist);
  const settingsPanel = el("tab-settings");
  bindSettingsAutoPlanListeners(
    settingsPanel,
    () => {
      return state.ready && Boolean(planController);
    },
    () => {
      planController?.queueAutoPlan();
    },
  );
  if (saved) {
    setStatus("Loaded saved data.");
  } else {
    setStatus("Loaded sample data.");
  }
  if (!saved?.last_result?.schedule?.length) {
    planController?.queueAutoPlan();
  }
}

function getInitialLoadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Failed to load initial data";
}

async function loadInitialData() {
  try {
    const saved = (await plannerApi.loadState()) as LoadedPlannerState;
    const source = await resolveInitialSource(saved);
    applyLoadedState(saved, source);
    finalizeInitialLoad(saved);
  } catch (error) {
    setStatus(getInitialLoadErrorMessage(error), true);
  }
}

function bindTodayActions() {
  el("startSessionFromTodayBtn").onclick = () => {
    activateSessionsAndStartTimer(state.lastResult, sessionsUI, activateTab);
  };
  el("viewScheduleFromTodayBtn").onclick = () => activateTab("schedule", { focusPanel: true });
}

async function init() {
  setupSkipLink();
  initSettingsGrid();
  bindTabs(handleTabChange);
  bindBooksUI(handleBooksChanged);
  bindHelpDialog();

  sessionsUI = createSessionsAppUI();
  planController = createAppPlanControllerInstance();

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

  await loadInitialData();
  bindTodayActions();
}
await init();
