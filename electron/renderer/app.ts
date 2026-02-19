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
import { activateSessionsAndStartTimer, updateTodayDashboard } from "./app/today.js";
const state = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
};
type LoadedPlannerState = {
  settings?: Parameters<typeof fillSettings>[0];
  books?: Parameters<typeof fillBooks>[0];
  preferences?: Parameters<typeof normalizePreferences>[0];
  feature_flags?: Parameters<typeof normalizeFeatureFlags>[0];
  schedule_completions?: Parameters<typeof normalizeScheduleCompletions>[0];
  sessions?: Parameters<ReturnType<typeof initSessionsUI>["setSessions"]>[0];
  last_result?: Parameters<ReturnType<typeof createPlanController>["applyLoadedResult"]>[0];
};

type PlannerApi = {
  loadState: () => Promise<LoadedPlannerState | null | undefined>;
  sample: () => Promise<Pick<LoadedPlannerState, "settings" | "books">>;
  saveState: (state: unknown) => Promise<unknown>;
};

const { plannerApi } = globalThis as typeof globalThis & { plannerApi: PlannerApi };
let sessionsUI: ReturnType<typeof initSessionsUI> | null = null;
let planController: ReturnType<typeof createPlanController> | null = null;
const announce = createAnnouncer();
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

async function init() {
  const skipLink = document.querySelector(".skip-link");
  if (skipLink) {
    skipLink.addEventListener("click", (event) => {
      event.preventDefault();
      el("mainContent").focus();
    });
  }

  initSettingsGrid();
  bindTabs((name) => {
    if (name === "sessions" && sessionsUI) {
      sessionsUI.refreshBooks();
    }
    if (name === "schedule") {
      focusCalendarToday();
    }
  });
  bindBooksUI(() => {
    if (sessionsUI) {
      sessionsUI.refreshBooks();
    }
    updateTodayView();
    queuePersist();
    if (state.ready && planController) {
      planController.queueAutoPlan();
    }
  });
  bindHelpDialog();

  sessionsUI = initSessionsUI({
    getBooks: collectBooks,
    initialSessions: [],
    onSessionsChanged: () => {
      updateTodayView();
      queuePersist();
      if (state.ready && planController) {
        planController.queueAutoPlan();
      }
    },
    announce,
    setStatus,
  });
  planController = createPlanController({
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    announce,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    updateTodayView,
    persistDraft,
    plannerApi,
    getLastResult: () => state.lastResult,
    setLastResult: (nextResult) => {
      state.lastResult = nextResult;
    },
    getSessions: () => sessionsUI.getSessions(),
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions) => {
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
    onProgressUpdated: () => {
      updateTodayView();
      if (state.ready && planController) {
        planController.queueAutoPlan();
      }
    },
  });

  try {
    const saved = await plannerApi.loadState();
    let source = saved;
    if (!(saved?.settings && saved?.books)) {
      source = await plannerApi.sample();
    }

    fillSettings(source.settings);
    fillBooks(source.books);
    state.preferences = normalizePreferences(saved?.preferences || {});
    state.featureFlags = normalizeFeatureFlags(saved?.feature_flags || {});
    state.scheduleCompletions = normalizeScheduleCompletions(saved?.schedule_completions || {});
    fillPreferencesUI(state.preferences, state.featureFlags);
    applyPreferencesToDocument(state.preferences);
    sessionsUI.setSessions(saved?.sessions || []);
    planController.applyLoadedResult(saved?.last_result || null);

    updateTodayView();
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
        planController.queueAutoPlan();
      },
    );
    if (saved) {
      setStatus("Loaded saved data.");
    } else {
      setStatus("Loaded sample data.");
    }
    if (!saved?.last_result?.schedule?.length) {
      planController.queueAutoPlan();
    }
  } catch (error) {
    let message = "Failed to load initial data";
    if (error instanceof Error && error.message) {
      message = error.message;
    }
    setStatus(message, true);
  }

  el("startSessionFromTodayBtn").onclick = () => {
    activateSessionsAndStartTimer(state.lastResult, sessionsUI, activateTab);
  };
  el("viewScheduleFromTodayBtn").onclick = () => activateTab("schedule", { focusPanel: true });
}
await init();
