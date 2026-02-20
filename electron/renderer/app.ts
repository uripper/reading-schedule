import { applyPreferencesToDocument, createAnnouncer } from "./a11y.js";
import { bindTabs } from "./tabs.js";
import { bindBooksUI, collectAllBooks, collectBooks, fillBooks, getBookById, setBookScheduleRows, updateBookProgress } from "./books.js";
import { WORDS_PER_PAGE } from "./books/constants.js";
import { schedulableBook, statusFromRaw } from "./books/status.js";
import { configureCalendarInteractions, focusCalendarToday, renderCalendar } from "./calendar.js";
import { sessionKeyFor } from "./calendar/utils.js";
import { bindDesktopShortcuts } from "./desktop_shortcuts.js";
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
import type { PlannerApi, PlannerResult, PlannerScheduleRow } from "./app/types.js";
import { updateTodayDashboard } from "./app/today.js";
import type { Session } from "./sessions/normalize.js";

const SPLASH_MIN_DURATION_MS = 2200;
const SPLASH_FADE_DURATION_MS = 600;
const PERCENT_SCALE = 100;
const PERCENT_ROUNDING_SCALE = 1000;

function createSplashController() {
  const splashScreen = document.getElementById("splashScreen");
  const startedAt = performance.now();

  const finish = () => {
    if (!(splashScreen instanceof HTMLElement)) {
      return;
    }

    document.body.classList.add("splash-exit");
    const removeSplash = () => {
      splashScreen.remove();
      document.body.classList.remove("splash-exit");
    };

    splashScreen.addEventListener("transitionend", removeSplash, { once: true });
    globalThis.setTimeout(removeSplash, SPLASH_FADE_DURATION_MS + 120);
  };

  const completeWhenReady = () => {
    const elapsed = performance.now() - startedAt;
    const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);
    globalThis.setTimeout(finish, remaining);
  };

  return { completeWhenReady };
}

function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayBookCompletionKey(rowDate: string, bookId: string): string {
  return `${rowDate}|${bookId}`;
}

function normalizedPercent(value: number): number {
  return Math.max(0, Math.min(PERCENT_SCALE, Number(value || 0)));
}

function fullWordsForBook(book: ReturnType<typeof collectBooks>[number]): number {
  const wordsTotal = Number(book.words_total || 0);
  if (Number.isFinite(wordsTotal) && wordsTotal > 0) {
    return wordsTotal;
  }
  const pagesTotal = Number(book.pages_total || 0);
  if (Number.isFinite(pagesTotal) && pagesTotal > 0) {
    return pagesTotal * WORDS_PER_PAGE;
  }
  return 0;
}

function completedWordsForTodayByBookId(
  rows: PlannerScheduleRow[] = [],
  scheduleCompletions: Record<string, boolean> = {},
  scheduleProgressUpdates: Record<string, boolean> = {},
): Record<string, number> {
  const today = todayDateKey();
  const out: Record<string, number> = {};
  rows.forEach((row) => {
    if (String(row.date || "") !== today) {
      return;
    }
    const sessionKey = sessionKeyFor(row);
    const fallbackKey = dayBookCompletionKey(String(row.date || ""), String(row.book_id || ""));
    const completed = Boolean(scheduleCompletions[sessionKey] || scheduleCompletions[fallbackKey]);
    if (!completed) {
      return;
    }
    const hasProgressUpdate = Boolean(
      scheduleProgressUpdates[sessionKey] || scheduleProgressUpdates[fallbackKey],
    );
    if (hasProgressUpdate) {
      return;
    }
    const bookId = String(row.book_id || "");
    if (!bookId) {
      return;
    }
    const plannedWords = Math.max(0, Number(row.words_planned || 0));
    out[bookId] = Number(out[bookId] || 0) + plannedWords;
  });
  return out;
}

const state: {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: typeof DEFAULT_PREFERENCES;
  featureFlags: typeof DEFAULT_FEATURE_FLAGS;
  scheduleCompletions: Record<string, boolean>;
  scheduleProgressUpdates: Record<string, boolean>;
  sessions: Session[];
} = {
  lastResult: null,
  ready: false,
  preferences: { ...DEFAULT_PREFERENCES },
  featureFlags: { ...DEFAULT_FEATURE_FLAGS },
  scheduleCompletions: {},
  scheduleProgressUpdates: {},
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
function updateTodayView() {
  updateTodayDashboard({
    lastResult: state.lastResult,
    scheduleCompletions: state.scheduleCompletions,
    books: collectAllBooks(),
    sessions: state.sessions,
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
    dailyGoalMinutes: Number(state.preferences.dailyGoalMinutes || DEFAULT_PREFERENCES.dailyGoalMinutes),
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
function handleSessionCompletionUpdated() {
  updateDashboards();
  queueAutoPlanIfReady();
}

function collectBooksForPlan() {
  const books = collectBooks();
  const completedWordsByBookId = completedWordsForTodayByBookId(
    state.lastResult?.schedule || [],
    state.scheduleCompletions,
    state.scheduleProgressUpdates,
  );
  const completedBookIds = Object.keys(completedWordsByBookId);
  if (!completedBookIds.length) {
    return books;
  }
  const adjustedBooks: ReturnType<typeof collectBooks> = [];
  books.forEach((book) => {
    const bookId = String(book.book_id || "");
    const completedWords = Number(completedWordsByBookId[bookId] || 0);
    if (completedWords <= 0) {
      adjustedBooks.push(book);
      return;
    }

    const fullWords = fullWordsForBook(book);
    if (fullWords <= 0) {
      adjustedBooks.push(book);
      return;
    }

    const currentWordsRead = Math.round((normalizedPercent(book.progress_percent) / PERCENT_SCALE) * fullWords);
    const nextWordsRead = Math.min(fullWords, currentWordsRead + completedWords);
    const nextProgress = Math.round((nextWordsRead / fullWords) * PERCENT_ROUNDING_SCALE) / 10;
    const pagesTotal = Number(book.pages_total || 0);
    let nextPagesRead = book.pages_read ?? null;
    if (Number.isFinite(pagesTotal) && pagesTotal > 0) {
      nextPagesRead = Math.round((nextProgress / PERCENT_SCALE) * pagesTotal);
    }
    const nextStatus = statusFromRaw(book.status, nextProgress);
    const nextBook = {
      ...book,
      status: nextStatus,
      progress_percent: nextProgress,
      pages_read: nextPagesRead,
    };
    if (schedulableBook(nextBook)) {
      adjustedBooks.push(nextBook);
    }
  });
  return adjustedBooks;
}
async function init() {
  setupSkipLink();
  bindDesktopShortcuts({
    plannerApi,
    announce,
  });
  initSettingsGrid();
  bindTabs(handleTabChange);
  bindBooksUI(handleBooksChanged);
  bindHelpDialog();
  planController = createAppPlanControllerInstance({
    collectBooks: collectBooksForPlan,
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
    onSessionCompletionUpdated: handleSessionCompletionUpdated,
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

const splash = createSplashController();
await init();
splash.completeWhenReady();
