import type {
    PersistQueue,
    PersistQueueArgs,
    PlannerSummary,
} from "../../types/types.ts";
import { draftData, saveStateSafe } from "./persistence.ts";

const PERSIST_DELAY_MS = 300;
const NO_WORDS = 0;
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

interface PersistTimerState {
    timer: ReturnType<typeof setTimeout> | null;
}

type PersistDraftFn = PersistQueue["persistDraft"];
type QueuePersistFn = PersistQueue["queuePersist"];

/**
 * Builds a status setter that updates UI status text and mirrors messages to logs.
 * @param statusNode - Status element shown in the planner UI.
 * @param addLog - Callback used to append status messages to runtime logs.
 * @returns Function that sets status text and applies error styling when needed.
 */
export function createStatusSetter(
    statusNode: HTMLElement,
    addLog: (message: string) => void,
): (message: string, isError?: boolean) => void {
    const NODE = statusNode;
    return (message: string, isError = false): void => {
        NODE.textContent = message;
        NODE.style.color = "var(--app-textMuted)";
        if (isError) {
            NODE.style.color = "var(--app-danger)";
        }
        addLog(message);
    };
}

function normalizedWordCount(value: unknown): number | null {
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
 * Creates persistence helpers for saving draft state with debounced writes.
 * @param root0 - Dependencies and state required for persistence queue management.
 * @param plannerApi - Planner API subset used to save state snapshots.
 * @param state - Mutable runtime state used to compose saved payload data.
 * @param getSessions - Returns normalized session records from runtime state.
 * @param collectBooks - Returns current book list for persistence snapshots.
 * @param collectSettings - Returns planner settings values from the UI.
 * @param addLog - Callback used to record persistence errors.
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
    const TIMER_STATE: PersistTimerState = { timer: null };
    const PERSIST_DRAFT = persistDraftFn({
        addLog,
        collectBooks,
        collectSettings,
        getSessions,
        plannerApi,
        state,
    });
    const QUEUE_PERSIST = queuePersistFn({
        addLog,
        persistDraft: PERSIST_DRAFT,
        state,
        timerState: TIMER_STATE,
    });
    return persistQueueResult(PERSIST_DRAFT, QUEUE_PERSIST);
}

function persistQueueResult(
    persistDraft: PersistDraftFn,
    queuePersist: QueuePersistFn,
): PersistQueue {
    return { persistDraft, queuePersist };
}

function persistDraftPayload(args: PersistQueueArgs) {
    return draftData({
        blockedDayBooks: args.state.blockedDayBooks,
        collectBooks: args.collectBooks,
        collectSettings: args.collectSettings,
        featureFlags: args.state.featureFlags,
        lastResult: args.state.lastResult,
        preferences: args.state.preferences,
        scheduleCompletions: args.state.scheduleCompletions,
        sessions: args.getSessions(),
    });
}

function persistDraftFn(args: PersistQueueArgs): PersistDraftFn {
    return async (): Promise<boolean> => {
        const PAYLOAD = persistDraftPayload(args);
        return await saveStateSafe(args.plannerApi, PAYLOAD, args.addLog);
    };
}

function clearPersistTimer(timerState: PersistTimerState): void {
    if (timerState.timer === null) {
        return;
    }
    clearTimeout(timerState.timer);
}

function persistDraftFailure(addLog: (message: string) => void): void {
    addLog("Failed to persist draft state.");
}

function queuePersistFn(options: {
    addLog: (message: string) => void;
    persistDraft: PersistDraftFn;
    state: PersistQueueArgs["state"];
    timerState: PersistTimerState;
}): QueuePersistFn {
    return (): void => {
        if (!options.state.ready) {
            return;
        }
        clearPersistTimer(options.timerState);
        const TIMER_STATE = options.timerState;
        TIMER_STATE.timer = setTimeout(() => {
            options.persistDraft().catch(() => {
                persistDraftFailure(options.addLog);
            });
        }, PERSIST_DELAY_MS);
    };
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
