import type { PlannerSummary, StatusPhase } from "../../types/types.ts";
import type { ScheduleStatusOverlay } from "./schedule-status-overlay.ts";
import { createScheduleStatusOverlay } from "./schedule-status-overlay.ts";
import { applyStatusPhase, statusColor } from "./status-phase.ts";

const NO_WORDS = 0;
const NON_PLANNING_SETTING_IDS = new Set([
    "reduceMotionToggle",
    "dailyGoalInput",
    "reminderEnabledToggle",
    "reminderTimeInput",
]);

/**
 * Builds a status setter that updates UI status text and mirrors messages to logs.
 * @param statusNode - Status element shown in the planner UI.
 * @param addLog - Callback used to append status messages to runtime logs.
 * @returns Function that sets status text and applies error styling when needed.
 */
export function createStatusSetter(
    statusNode: HTMLElement,
    addLog: (message: string) => void,
    overlay: ScheduleStatusOverlay = createScheduleStatusOverlay(),
): (message: string, isError?: boolean, phase?: StatusPhase) => void {
    const NODE = statusNode;
    return (message: string, isError = false, phase?: StatusPhase): void => {
        NODE.textContent = message;
        NODE.style.color = statusColor(isError);
        applyStatusPhase(overlay, phase);
        addLog(message);
    };
}

function normalizedWordCount(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const PARSED = Number(value);
    if (!Number.isFinite(PARSED)) {
        return null;
    }
    if (PARSED < NO_WORDS) {
        return NO_WORDS;
    }
    return PARSED;
}

function summaryWordsRemaining(info: unknown): number {
    if (typeof info !== "object" || info === null) {
        return NO_WORDS;
    }
    const INFO = info as Record<string, unknown>;
    const WORD_COUNT =
        normalizedWordCount(INFO.remaining_words) ??
        normalizedWordCount(INFO.words_total) ??
        normalizedWordCount(INFO.words_planned);
    return WORD_COUNT ?? NO_WORDS;
}

/**
 * Extracts per-book remaining word counts from planner summary output.
 * @param summary - Planner summary payload from generation result.
 * @returns Map of book id to remaining words used by finish projections.
 */
export function totalsFromSummary(
    summary: PlannerSummary | null,
): Record<string, number> {
    const PER_BOOK = summary?.per_book ?? {};
    const TOTALS: Record<string, number> = {};
    for (const [ID, INFO] of Object.entries(PER_BOOK)) {
        TOTALS[ID] = summaryWordsRemaining(INFO);
    }
    return TOTALS;
}

/**
 * Determines whether a settings mutation should trigger automatic re-planning.
 * @param target - Event target element from settings interactions.
 * @returns True when the target affects planning inputs.
 */
function shouldAutoPlanTarget(target: HTMLElement): boolean {
    const ID = String(target.id || "");
    if (!ID) {
        return false;
    }
    if (NON_PLANNING_SETTING_IDS.has(ID)) {
        return false;
    }
    return true;
}

function eventTargetElement(event: Event): HTMLElement | null {
    if (!(event.target instanceof HTMLElement)) {
        return null;
    }
    return event.target;
}

function shouldQueueSettingMutation(
    event: Event,
    isReady: () => boolean,
): boolean {
    if (!isReady()) {
        return false;
    }
    const TARGET = eventTargetElement(event);
    if (TARGET === null) {
        return false;
    }
    return shouldAutoPlanTarget(TARGET);
}

function clickedDayOffControl(target: HTMLElement): boolean {
    const ADD_DAY_OFF = target.closest("#addDayOffBtn");
    const REMOVE_DAY_OFF = target.closest("#dayOffList .chip-btn");
    return Boolean(ADD_DAY_OFF || REMOVE_DAY_OFF);
}

function shouldQueueSettingClick(
    event: Event,
    isReady: () => boolean,
): boolean {
    if (!isReady()) {
        return false;
    }
    const TARGET = eventTargetElement(event);
    if (TARGET === null) {
        return false;
    }
    return clickedDayOffControl(TARGET);
}

function bindSettingsAutoPlanEvents(options: {
    onSettingClick: (event: Event) => void;
    onSettingMutation: (event: Event) => void;
    settingsPanel: HTMLElement;
}): void {
    options.settingsPanel.addEventListener("input", options.onSettingMutation);
    options.settingsPanel.addEventListener("change", options.onSettingMutation);
    options.settingsPanel.addEventListener("click", options.onSettingClick);
}

/**
 * Binds settings listeners that queue automatic plan refresh when planning inputs change.
 * @param settingsPanel - Settings container element hosting planner controls.
 * @param isReady - Callback indicating whether runtime initialization has completed.
 * @param queueAutoPlan - Callback that schedules an automatic planner run.
 */
export function bindSettingsAutoPlanListeners(
    settingsPanel: HTMLElement,
    isReady: () => boolean,
    queueAutoPlan: () => void,
): void {
    const ON_SETTING_MUTATION = (event: Event): void => {
        if (!shouldQueueSettingMutation(event, isReady)) {
            return;
        }
        queueAutoPlan();
    };
    const ON_SETTING_CLICK = (event: Event): void => {
        if (!shouldQueueSettingClick(event, isReady)) {
            return;
        }
        queueAutoPlan();
    };
    bindSettingsAutoPlanEvents({
        onSettingClick: ON_SETTING_CLICK,
        onSettingMutation: ON_SETTING_MUTATION,
        settingsPanel,
    });
}
