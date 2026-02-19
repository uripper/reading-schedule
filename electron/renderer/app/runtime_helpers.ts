
import { draftData, saveStateSafe } from "./persistence.js";
import type { FeatureFlags, Preferences } from "./experience.js";

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

type SummaryBookInfo = {
  words_total?: number;
};

type Summary = {
  per_book?: Record<string, SummaryBookInfo>;
};

type PersistQueueState = {
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  lastResult: unknown;
};

type PersistQueueArgs = {
  plannerApi: typeof globalThis.plannerApi;
  state: PersistQueueState;
  getSessionsUI: () => { getSessions: () => unknown[] } | null;
  collectBooks: () => unknown[];
  collectSettings: () => unknown;
  addLog: (message: string) => void;
};

export function createStatusSetter(statusNode: HTMLElement, addLog: (message: string) => void) {
  return (message: string, isError = false) => {
    statusNode.textContent = message;
    statusNode.style.color = "var(--app-textMuted)";
    if (isError) {
      statusNode.style.color = "var(--app-danger)";
    }
    addLog(message);
  };
}

export function totalsFromSummary(summary: Summary | null): Record<string, number> {
  const perBook = summary?.per_book || {};
  const pairs = Object.entries(perBook).map(([id, info]) => {
    return [id, Number(info.words_total || 0)];
  });
  return Object.fromEntries(pairs);
}

export function createPersistQueue({
  plannerApi,
  state,
  getSessionsUI,
  collectBooks,
  collectSettings,
  addLog,
}: PersistQueueArgs) {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistDraft = async () => {
    const payload = draftData({
      collectBooks,
      collectSettings,
      sessionsUI: getSessionsUI(),
      preferences: state.preferences,
      featureFlags: state.featureFlags,
      scheduleCompletions: state.scheduleCompletions,
      lastResult: state.lastResult,
    });
    return saveStateSafe(plannerApi, payload, addLog);
  };

  const queuePersist = () => {
    if (!state.ready) {
      return;
    }
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      void persistDraft();
    }, PERSIST_DELAY_MS);
  };

  return {
    persistDraft,
    queuePersist,
  };
}

function shouldAutoPlanTarget(target) {
  const id = String(target.id || "");
  if (!id) {
    return false;
  }
  if (NON_PLANNING_SETTING_IDS.has(id)) {
    return false;
  }
  return true;
}

export function bindSettingsAutoPlanListeners(
  settingsPanel: HTMLElement,
  isReady: () => boolean,
  queueAutoPlan: () => void,
) {
  const onSettingMutation = (event: Event) => {
    if (!isReady()) {
      return;
    }
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (!shouldAutoPlanTarget(event.target)) {
      return;
    }
    queueAutoPlan();
  };

  const onSettingClick = (event: Event) => {
    if (!isReady()) {
      return;
    }
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    const addDayOff = event.target.closest("#addDayOffBtn");
    const removeDayOff = event.target.closest("#dayOffList .chip-btn");
    if (addDayOff || removeDayOff) {
      queueAutoPlan();
    }
  };

  settingsPanel.addEventListener("input", onSettingMutation);
  settingsPanel.addEventListener("change", onSettingMutation);
  settingsPanel.addEventListener("click", onSettingClick);
}
