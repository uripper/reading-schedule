// @ts-nocheck
import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { activateTab, bindTabs } from "./tabs.js";
import { bindBooksUI, collectBooks, fillBooks, getBookById, setBookScheduleRows, updateBookProgress } from "./books.js";
import { configureCalendarInteractions, renderCalendar } from "./calendar.js";
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
import { draftData, saveStateSafe } from "./app/persistence.js";
import { activateSessionsAndStartTimer, updateTodayDashboard } from "./app/today.js";
const PERSIST_DELAY_MS = 300;
const NON_PLANNING_SETTING_IDS = new Set([
  "themeSelect",
  "reduceMotionToggle",
  "dailyGoalInput",
  "reminderEnabledToggle",
  "reminderTimeInput",
  "flagGamification",
  "flagSocial",
  "flagRecommendations",
]);
const state = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
};
let persistTimer = null;
let sessionsUI = null;
let planController = null;
const announce = createAnnouncer();

function setStatus(message, isError = false) {
  const node = el("status");
  node.textContent = message;
  node.style.color = "var(--app-textMuted)";
  if (isError) {
    node.style.color = "var(--app-danger)";
  }
  addLog(message);
}

async function persistDraft() {
  const payload = draftData({
    sessionsUI,
    collectBooks,
    collectSettings,
    preferences: state.preferences,
    featureFlags: state.featureFlags,
    scheduleCompletions: state.scheduleCompletions,
    lastResult: state.lastResult,
  });
  return saveStateSafe(globalThis.plannerApi, payload, addLog);
}

function queuePersist() {
  if (!state.ready) {
    return;
  }
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    void persistDraft();
  }, PERSIST_DELAY_MS);
}

function updateTodayView() {
  updateTodayDashboard({
    sessionsUI,
    lastResult: state.lastResult,
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

function queueAutoPlanFromSettings(event) {
  if (!state.ready || !planController) {
    return;
  }
  if (!(event.target instanceof HTMLElement)) {
    return;
  }
  const id = String(event.target.id || "");
  if (NON_PLANNING_SETTING_IDS.has(id)) {
    return;
  }
  planController.queueAutoPlan();
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
    plannerApi: globalThis.plannerApi,
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    announce,
    getLastResult: () => state.lastResult,
    setLastResult: (nextResult) => {
      state.lastResult = nextResult;
    },
    getSessions: () => sessionsUI.getSessions(),
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions) => {
      state.scheduleCompletions = nextCompletions;
    },
    renderCalendar,
    totalsFromSummary: (summary) => {
      const perBook = summary?.per_book || {};
      const pairs = Object.entries(perBook).map(([id, info]) => {
        return [id, Number(info.words_total || 0)];
      });
      return Object.fromEntries(pairs);
    },
    setBookScheduleRows,
    updateTodayView,
    persistDraft,
  });

  bindExperienceSettings(applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state,
    queuePersist,
    setStatus,
    updateBookProgress,
    getBookById,
    onProgressUpdated: () => {
      if (state.ready && planController) {
        planController.queueAutoPlan();
      }
    },
  });

  try {
    const saved = await globalThis.plannerApi.loadState();
    let source = saved;
    if (!(saved?.settings && saved?.books)) {
      source = await globalThis.plannerApi.sample();
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
    settingsPanel.addEventListener("input", queueAutoPlanFromSettings);
    settingsPanel.addEventListener("change", queueAutoPlanFromSettings);
    settingsPanel.addEventListener("click", (event) => {
      if (!state.ready || !planController) {
        return;
      }
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      const addDayOff = event.target.closest("#addDayOffBtn");
      const removeDayOff = event.target.closest("#dayOffList .chip-btn");
      if (addDayOff || removeDayOff) {
        planController.queueAutoPlan();
      }
    });
    if (saved) {
      setStatus("Loaded saved data.");
    } else {
      setStatus("Loaded sample data.");
    }
    if (!saved?.last_result?.schedule?.length) {
      planController.queueAutoPlan();
    }
  } catch (error) {
    setStatus(error.message || "Failed to load initial data", true);
  }

  el("startSessionFromTodayBtn").onclick = () => {
    activateSessionsAndStartTimer(state.lastResult, sessionsUI, activateTab);
  };
  el("viewScheduleFromTodayBtn").onclick = () => activateTab("schedule", { focusPanel: true });
}
await init();
