import type {
    PersistQueue,
    PersistQueueArgs,
    PlannerSummary,
} from "../../types/types.js";
import { draftData, saveStateSafe } from "./persistence.js";

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

/**
 * Builds a status setter that updates UI status text and mirrors messages to logs.
 * @param statusNode Status element shown in the planner UI.
 * @param addLog Callback used to append status messages to runtime logs.
 * @returns Function that sets status text and applies error styling when needed.
 */
export function createStatusSetter(
    statusNode: HTMLElement,
    addLog: (message: string) => void,
): (message: string, isError?: boolean) => void {
    const node = statusNode;
    return (message: string, isError = false): void => {
        node.textContent = message;
        node.style.color = "var(--app-textMuted)";
        if (isError) {
            node.style.color = "var(--app-danger)";
        }
        addLog(message);
    };
}

/**
 * Extracts per-book total word counts from planner summary output.
 * @param summary Planner summary payload from generation result.
 * @returns Map of book id to total planned words.
 */
export function totalsFromSummary(
    summary: PlannerSummary | null,
): Record<string, number> {
    const perBook = summary?.per_book ?? {};
    const totals: Record<string, number> = {};
    Object.entries(perBook).forEach(([id, info]) => {
        totals[id] = Number(info.words_total ?? 0);
    });
    return totals;
}

/**
 * Creates persistence helpers for saving draft state with debounced writes.
 * @param root0 Dependencies and state required for persistence queue management.
 * @param root0.plannerApi Planner API subset used to save state snapshots.
 * @param root0.state Mutable runtime state used to compose saved payload data.
 * @param root0.getSessions Returns normalized session records from runtime state.
 * @param root0.collectBooks Returns current book list for persistence snapshots.
 * @param root0.collectSettings Returns planner settings values from the UI.
 * @param root0.addLog Callback used to record persistence errors.
 * @returns Draft persistence functions for immediate save and queued save.
 */
export function createPersistQueue({
    plannerApi,
    state,
    getSessions,
    collectBooks,
    collectSettings,
    addLog,
}: PersistQueueArgs): PersistQueue {
    let persistTimer: ReturnType<typeof setTimeout> | null = null;

    const persistDraft = async (): Promise<boolean> => {
        const payload = draftData({
            collectBooks,
            collectSettings,
            sessions: getSessions(),
            preferences: state.preferences,
            featureFlags: state.featureFlags,
            scheduleCompletions: state.scheduleCompletions,
            blockedDayBooks: state.blockedDayBooks,
            lastResult: state.lastResult,
        });
        return await saveStateSafe(plannerApi, payload, addLog);
    };

    const queuePersist = (): void => {
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
 * Determines whether a settings mutation should trigger automatic re-planning.
 * @param target Event target element from settings interactions.
 * @returns True when the target affects planning inputs.
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
 * Binds settings listeners that queue automatic plan refresh when planning inputs change.
 * @param settingsPanel Settings container element hosting planner controls.
 * @param isReady Callback indicating whether runtime initialization has completed.
 * @param queueAutoPlan Callback that schedules an automatic planner run.
 */
export function bindSettingsAutoPlanListeners(
    settingsPanel: HTMLElement,
    isReady: () => boolean,
    queueAutoPlan: () => void,
): void {
    const onSettingMutation = (event: Event): void => {
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

    const onSettingClick = (event: Event): void => {
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
