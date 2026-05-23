import type { PersistQueue, PersistQueueArgs } from "../../types/types.ts";
import { draftData, saveStateSafe } from "./persistence.ts";

const PERSIST_DELAY_MS = 300;

interface PersistTimerState {
    activePersists: Set<Promise<boolean>>;
    timer: ReturnType<typeof setTimeout> | null;
}

type PersistDraftFn = PersistQueue["persistDraft"];
type PrepareForStateImportFn = PersistQueue["prepareForStateImport"];
type QueuePersistFn = PersistQueue["queuePersist"];

export function createPersistQueue(args: PersistQueueArgs): PersistQueue {
    const TIMER_STATE = persistTimerState();
    const PERSIST_DRAFT = persistDraftFn(args, TIMER_STATE);
    const QUEUE_PERSIST = queuePersistFn({
        addLog: args.addLog,
        persistDraft: PERSIST_DRAFT,
        state: args.state,
        timerState: TIMER_STATE,
    });
    return {
        persistDraft: PERSIST_DRAFT,
        prepareForStateImport: prepareForStateImportFn(TIMER_STATE),
        queuePersist: QUEUE_PERSIST,
    };
}

function persistTimerState(): PersistTimerState {
    return {
        activePersists: new Set(),
        timer: null,
    };
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

function persistDraftFn(
    args: PersistQueueArgs,
    timerState: PersistTimerState,
): PersistDraftFn {
    return async (): Promise<boolean> => {
        const PAYLOAD = persistDraftPayload(args);
        const ACTIVE_PERSIST = saveStateSafe(
            args.plannerApi,
            PAYLOAD,
            args.addLog,
        );
        timerState.activePersists.add(ACTIVE_PERSIST);
        try {
            return await ACTIVE_PERSIST;
        } finally {
            timerState.activePersists.delete(ACTIVE_PERSIST);
        }
    };
}

function clearPersistTimer(timerState: PersistTimerState): void {
    const TIMER_STATE = timerState;
    if (TIMER_STATE.timer === null) {
        return;
    }
    clearTimeout(TIMER_STATE.timer);
    TIMER_STATE.timer = null;
}

function prepareForStateImportFn(
    timerState: PersistTimerState,
): PrepareForStateImportFn {
    return async (): Promise<void> => {
        clearPersistTimer(timerState);
        await waitForActivePersists(timerState);
    };
}

async function waitForActivePersists(
    timerState: PersistTimerState,
): Promise<void> {
    const ACTIVE_PERSISTS = [...timerState.activePersists];
    if (ACTIVE_PERSISTS.length === 0) {
        return;
    }
    await Promise.all(ACTIVE_PERSISTS);
    return waitForActivePersists(timerState);
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
            TIMER_STATE.timer = null;
            options.persistDraft().catch(() => {
                persistDraftFailure(options.addLog);
            });
        }, PERSIST_DELAY_MS);
    };
}
