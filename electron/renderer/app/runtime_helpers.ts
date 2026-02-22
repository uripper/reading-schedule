import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { FeatureFlags, Preferences } from "./experience/index.js";
import { draftData, saveStateSafe } from "./persistence.js";
import type {
  PlannerApi,
  PlannerResult,
  PlannerSettings,
  PlannerSummary,
} from "./types.js";

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

interface PersistQueueState {
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

interface PersistQueueArgs {
  plannerApi: Pick<PlannerApi, "saveState">;
  state: PersistQueueState;
  getSessions(): Session[];
  collectBooks(): Book[];
  collectSettings(): PlannerSettings;
  addLog(message: string): void;
}

/**
 *
 * @param statusNode
 * @param addLog
 */
export function createStatusSetter(
  statusNode: HTMLElement,
  addLog: (message: string) => void,
) {
  return (message: string, isError = false) => {
    statusNode.textContent = message;
    statusNode.style.color = "var(--app-textMuted)";
    if (isError) {
      statusNode.style.color = "var(--app-danger)";
    }
    addLog(message);
  };
}

/**
 *
 * @param summary
 */
export function totalsFromSummary(
  summary: PlannerSummary | null,
): Record<string, number> {
  const perBook = summary?.per_book || {};
  const pairs = Object.entries(perBook).map(([id, info]) => {
    return [id, Number(info.words_total || 0)];
  });
  return Object.fromEntries(pairs);
}

/**
 *
 * @param root0
 * @param root0.plannerApi
 * @param root0.state
 * @param root0.getSessions
 * @param root0.collectBooks
 * @param root0.collectSettings
 * @param root0.addLog
 */
export function createPersistQueue({
  plannerApi,
  state,
  getSessions,
  collectBooks,
  collectSettings,
  addLog,
}: PersistQueueArgs) {
  let persistTimer: ReturnType<typeof setTimeout> | null = null;

  const persistDraft = async () => {
    const payload = draftData({
      collectBooks,
      collectSettings,
      sessions: getSessions(),
      preferences: state.preferences,
      featureFlags: state.featureFlags,
      scheduleCompletions: state.scheduleCompletions,
      lastResult: state.lastResult,
    });
    return await saveStateSafe(plannerApi, payload, addLog);
  };

  const queuePersist = () => {
    if (!state.ready) {
      return;
    }
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      persistDraft().catch(() => {
        addLog("Failed to persist draft state.");
      });
    }, PERSIST_DELAY_MS);
  };

  return {
    persistDraft,
    queuePersist,
  };
}

/**
 *
 * @param target
 */
function shouldAutoPlanTarget(target: HTMLElement): boolean {
  const id = String(target.id || "");
  if (!id) {
    return false;
  }
  if (NON_PLANNING_SETTING_IDS.has(id)) {
    return false;
  }
  return true;
}

/**
 *
 * @param settingsPanel
 * @param isReady
 * @param queueAutoPlan
 */
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
