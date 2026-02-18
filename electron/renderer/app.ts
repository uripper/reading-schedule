// @ts-nocheck
import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { activateTab, bindTabs } from "./tabs.js";
import { bindBooksUI, collectBooks, fillBooks, getBookById, updateBookProgress } from "./books.js";
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
import { draftData, saveStateSafe } from "./app/persistence.js";
import { runPlanGeneration } from "./app/plan.js";
import { activateSessionsAndStartTimer, totalsFromSummary, updateTodayDashboard } from "./app/today.js";

const PERSIST_DELAY_MS = 300;
const state = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
};
let persistTimer = null;
let sessionsUI = null;
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

async function run() {
  await runPlanGeneration({
    collectBooks,
    collectSettings,
    setStatus,
    addLog,
    announce,
    plannerApi: globalThis.plannerApi,
    onSuccess: async (data) => {
      state.scheduleCompletions = {};
      state.lastResult = {
        schedule: data.schedule,
        summary: data.summary,
        created_at: new Date().toISOString(),
      };
      renderCalendar(data.schedule, totalsFromSummary(data.summary));
      activateTab("schedule", { focusPanel: true });
      updateTodayView();
      await persistDraft();
    },
  });
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
  });
  bindHelpDialog();

  sessionsUI = initSessionsUI({
    getBooks: collectBooks,
    initialSessions: [],
    onSessionsChanged: () => {
      updateTodayView();
      queuePersist();
    },
    announce,
    setStatus,
  });

  bindExperienceSettings(applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state,
    queuePersist,
    setStatus,
    updateBookProgress,
    getBookById,
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

    if (saved?.last_result?.schedule?.length) {
      state.lastResult = saved.last_result;
      renderCalendar(saved.last_result.schedule, totalsFromSummary(saved.last_result.summary));
      addLog("Loaded previous schedule.");
    }

    updateTodayView();
    state.ready = true;
    document.addEventListener("input", queuePersist);
    document.addEventListener("change", queuePersist);
    if (saved) {
      setStatus("Loaded saved data.");
    } else {
      setStatus("Loaded sample data.");
    }
  } catch (error) {
    setStatus(error.message || "Failed to load initial data", true);
  }

  el("runBtn").onclick = run;
  el("startSessionFromTodayBtn").onclick = () => {
    activateSessionsAndStartTimer(state.lastResult, sessionsUI, activateTab);
  };
  el("viewScheduleFromTodayBtn").onclick = () => activateTab("schedule", { focusPanel: true });
}

await init();
