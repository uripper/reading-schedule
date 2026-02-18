import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { el } from "./dom.js";
import { bindBooksUI, collectBooks, fillBooks } from "./books.js";
import { firstPlannedRow, renderCalendar } from "./calendar.js";
import { addLog, bindHelpDialog } from "./help.js";
import { initSessionsUI } from "./sessions.js";
import { collectSettings, fillSettings, initSettingsGrid } from "./settings.js";
import { activateTab, bindTabs } from "./tabs.js";

const DEFAULT_PREFERENCES = {
  theme: "system",
  reduceMotion: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dailyGoalMinutes: 30,
  reminderEnabled: false,
  reminderTime: "20:00",
};

const DEFAULT_FEATURE_FLAGS = {
  gamificationEnabled: false,
  socialEnabled: false,
  recommendationsEnabled: false,
};

const state = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
};

let persistTimer = null;
let sessionsUI = null;
const announce = createAnnouncer();

function totalsFromSummary(summary) {
  return Object.fromEntries(Object.entries(summary?.per_book || {}).map(([id, info]) => [id, Number(info.words_total || 0)]));
}

function normalizePreferences(raw = {}) {
  let theme = DEFAULT_PREFERENCES.theme;
  if (["system", "light", "dark"].includes(raw.theme)) {
    theme = raw.theme;
  }
  const dailyGoalMinutes = Number(raw.dailyGoalMinutes || raw.daily_goal_minutes || DEFAULT_PREFERENCES.dailyGoalMinutes);
  let normalizedDailyGoalMinutes = DEFAULT_PREFERENCES.dailyGoalMinutes;
  if (Number.isFinite(dailyGoalMinutes) && dailyGoalMinutes > 0) {
    normalizedDailyGoalMinutes = Math.round(dailyGoalMinutes);
  }
  return {
    theme,
    reduceMotion: Boolean(raw.reduceMotion),
    timezone: String(raw.timezone || DEFAULT_PREFERENCES.timezone),
    dailyGoalMinutes: normalizedDailyGoalMinutes,
    reminderEnabled: Boolean(raw.reminderEnabled),
    reminderTime: String(raw.reminderTime || DEFAULT_PREFERENCES.reminderTime),
  };
}

function normalizeFeatureFlags(raw = {}) {
  return {
    gamificationEnabled: Boolean(raw.gamificationEnabled),
    socialEnabled: Boolean(raw.socialEnabled),
    recommendationsEnabled: Boolean(raw.recommendationsEnabled),
  };
}

function setStatus(message, isError = false) {
  const node = el("status");
  node.textContent = message;
  node.style.color = "var(--app-textMuted)";
  if (isError) {
    node.style.color = "var(--app-danger)";
  }
  addLog(message);
}

function collectPreferencesFromUI() {
  return {
    theme: el("themeSelect").value,
    reduceMotion: el("reduceMotionToggle").checked,
    timezone: DEFAULT_PREFERENCES.timezone,
    dailyGoalMinutes: Number(el("dailyGoalInput").value || DEFAULT_PREFERENCES.dailyGoalMinutes),
    reminderEnabled: el("reminderEnabledToggle").checked,
    reminderTime: el("reminderTimeInput").value || DEFAULT_PREFERENCES.reminderTime,
  };
}

function collectFeatureFlagsFromUI() {
  return {
    gamificationEnabled: el("flagGamification").checked,
    socialEnabled: el("flagSocial").checked,
    recommendationsEnabled: el("flagRecommendations").checked,
  };
}

function fillPreferencesUI(preferences, featureFlags) {
  el("themeSelect").value = preferences.theme;
  el("reduceMotionToggle").checked = Boolean(preferences.reduceMotion);
  el("dailyGoalInput").value = String(preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes);
  el("reminderEnabledToggle").checked = Boolean(preferences.reminderEnabled);
  el("reminderTimeInput").value = preferences.reminderTime || DEFAULT_PREFERENCES.reminderTime;
  el("flagGamification").checked = Boolean(featureFlags.gamificationEnabled);
  el("flagSocial").checked = Boolean(featureFlags.socialEnabled);
  el("flagRecommendations").checked = Boolean(featureFlags.recommendationsEnabled);
}

function draftData() {
  let sessions = [];
  if (sessionsUI) {
    sessions = sessionsUI.getSessions();
  }
  return {
    books: collectBooks(),
    settings: collectSettings(),
    sessions,
    preferences: state.preferences,
    feature_flags: state.featureFlags,
    last_result: state.lastResult,
  };
}

async function saveStateSafe() {
  try {
    const result = await window.plannerApi.saveState(draftData());
    if (result?.ok === false) {
      addLog(`Save failed: ${result.error || "Unknown state persistence error"}`);
      return false;
    }
    return true;
  } catch (error) {
    addLog(`Save failed: ${error.message || error}`);
    return false;
  }
}

function queuePersist() {
  if (!state.ready) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void saveStateSafe();
  }, 300);
}

function applyExperienceSettings() {
  state.preferences = normalizePreferences(collectPreferencesFromUI());
  state.featureFlags = normalizeFeatureFlags(collectFeatureFlagsFromUI());
  applyPreferencesToDocument(state.preferences);
  updateTodayDashboard();
  queuePersist();
}

function updateTodayDashboard() {
  const summaryNode = el("todaySummary");
  const goalText = el("todayGoalText");
  const goalProgress = el("todayGoalProgress");
  const goalBar = el("todayGoalBar");
  const gamificationCard = el("gamificationCard");
  const streakNode = el("streakText");

  const next = firstPlannedRow(state.lastResult?.schedule || []);
  if (next) {
    summaryNode.textContent = `Next planned session: ${next.title} for ${next.minutes} minutes on ${next.date}.`;
  } else {
    summaryNode.textContent = "No schedule generated yet. Add books and generate a plan to get a next-session suggestion.";
  }

  let todayMinutes = 0;
  if (sessionsUI) {
    todayMinutes = sessionsUI.todayMinutes();
  }
  const goalMinutes = Math.max(1, Number(state.preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes));
  const pct = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));
  goalText.textContent = `${todayMinutes} / ${goalMinutes} minutes logged today`;
  goalProgress.setAttribute("aria-valuenow", String(pct));
  goalBar.style.width = `${pct}%`;

  const gamificationOn = Boolean(state.featureFlags.gamificationEnabled);
  gamificationCard.hidden = !gamificationOn;
  if (gamificationOn) {
    let streak = 0;
    if (sessionsUI) {
      streak = sessionsUI.streakDays();
    }
    streakNode.textContent = `${streak} day streak`;
  }
}

function bindExperienceSettings() {
  [
    "themeSelect",
    "reduceMotionToggle",
    "dailyGoalInput",
    "reminderEnabledToggle",
    "reminderTimeInput",
    "flagGamification",
    "flagSocial",
    "flagRecommendations",
  ].forEach((id) => {
    const node = el(id);
    node.addEventListener("change", applyExperienceSettings);
  });
}

function activateSessionsAndStartTimer() {
  const next = firstPlannedRow(state.lastResult?.schedule || []);
  if (next?.book_id && sessionsUI) sessionsUI.selectBookById(next.book_id);
  activateTab("sessions", { focusPanel: true });
  if (sessionsUI) sessionsUI.startTimer();
}

async function run() {
  try {
    const payloadBooks = collectBooks();
    if (!payloadBooks.length) throw new Error("Add at least one book with pages or words before generating.");

    setStatus("Generating plan...");
    const payload = { planner: "mip", books: payloadBooks, settings: collectSettings() };
    const data = await window.plannerApi.generate(payload);

    state.lastResult = {
      schedule: data.schedule,
      summary: data.summary,
      created_at: new Date().toISOString(),
    };

    renderCalendar(data.schedule, totalsFromSummary(data.summary));
    activateTab("schedule", { focusPanel: true });

    if (data.summary.feasibility_warning) addLog(data.summary.feasibility_warning);
    addLog(`Status ${data.summary.status}. Planned ${data.summary.total_planned_minutes}/${data.summary.total_available_minutes} minutes.`);

    updateTodayDashboard();
    await saveStateSafe();
    setStatus("Plan generated.");
    announce("Plan generated and schedule updated.");
  } catch (error) {
    setStatus(error.message || "Failed to generate plan", true);
    announce(error.message || "Failed to generate plan", "assertive");
  }
}

async function init() {
  const skipLink = document.querySelector(".skip-link");
  skipLink?.addEventListener("click", (event) => {
    event.preventDefault();
    el("mainContent").focus();
  });

  initSettingsGrid();
  bindTabs((name) => {
    if (name === "sessions") sessionsUI?.refreshBooks();
  });

  bindBooksUI(() => {
    sessionsUI?.refreshBooks();
    updateTodayDashboard();
    queuePersist();
  });
  bindHelpDialog();

  sessionsUI = initSessionsUI({
    getBooks: collectBooks,
    initialSessions: [],
    onSessionsChanged: () => {
      updateTodayDashboard();
      queuePersist();
    },
    announce,
    setStatus,
  });

  bindExperienceSettings();

  try {
    const saved = await window.plannerApi.loadState();
    let source;
    if (saved?.settings && saved?.books) {
      source = saved;
    } else {
      source = await window.plannerApi.sample();
    }

    fillSettings(source.settings);
    fillBooks(source.books);

    state.preferences = normalizePreferences(saved?.preferences || {});
    state.featureFlags = normalizeFeatureFlags(saved?.feature_flags || {});
    fillPreferencesUI(state.preferences, state.featureFlags);
    applyPreferencesToDocument(state.preferences);

    sessionsUI.setSessions(saved?.sessions || []);

    if (saved?.last_result?.schedule?.length) {
      state.lastResult = saved.last_result;
      renderCalendar(saved.last_result.schedule, totalsFromSummary(saved.last_result.summary));
      addLog("Loaded previous schedule.");
    }

    updateTodayDashboard();
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
  el("startSessionFromTodayBtn").onclick = activateSessionsAndStartTimer;
  el("viewScheduleFromTodayBtn").onclick = () => activateTab("schedule", { focusPanel: true });
}

init();
