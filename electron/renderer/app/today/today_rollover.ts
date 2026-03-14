import { todayKey } from "../../sessions/utils.ts";

const MIN_DAY_ROLLOVER_DELAY_MS = 1;

interface DayRolloverDocument {
    addEventListener(type: "visibilitychange", listener: () => void): void;
    removeEventListener(type: "visibilitychange", listener: () => void): void;
    visibilityState: "hidden" | "visible";
}

type DayRolloverOptions = {
    document?: DayRolloverDocument;
    now?: () => Date;
    onDayChanged(): void;
    readDayKey?: () => string;
    clearTimeout?: typeof globalThis.clearTimeout;
    setTimeout?: typeof globalThis.setTimeout;
};

type ResolvedDayRolloverOptions = {
    document: DayRolloverDocument;
    now: () => Date;
    onDayChanged(): void;
    readDayKey: () => string;
    clearTimeout: typeof globalThis.clearTimeout;
    setTimeout: typeof globalThis.setTimeout;
};

type DayRolloverState = {
    activeDayKey: string;
    timeoutId: ReturnType<typeof globalThis.setTimeout> | null;
};

function nextLocalMidnightDelay(now: Date): number {
    const NEXT_MIDNIGHT = new Date(now);
    NEXT_MIDNIGHT.setHours(24, 0, 0, 0);
    return Math.max(
        MIN_DAY_ROLLOVER_DELAY_MS,
        NEXT_MIDNIGHT.getTime() - now.getTime(),
    );
}

function resolvedDayRolloverOptions(
    options: DayRolloverOptions,
): ResolvedDayRolloverOptions {
    return {
        clearTimeout: options.clearTimeout ?? globalThis.clearTimeout,
        document: options.document ?? globalThis.document,
        now: options.now ?? (() => new Date()),
        onDayChanged: options.onDayChanged,
        readDayKey: options.readDayKey ?? todayKey,
        setTimeout: options.setTimeout ?? globalThis.setTimeout,
    };
}

function createDayRolloverState(
    readDayKey: () => string,
): DayRolloverState {
    return {
        activeDayKey: readDayKey(),
        timeoutId: null,
    };
}

function scheduleNextDayCheck(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
    checkForDayChange: () => void,
): void {
    if (state.timeoutId !== null) {
        options.clearTimeout(state.timeoutId);
    }
    state.timeoutId = options.setTimeout(() => {
        checkForDayChange();
    }, nextLocalMidnightDelay(options.now()));
}

function handleDayChange(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
): void {
    const NEXT_DAY_KEY = options.readDayKey();
    if (NEXT_DAY_KEY !== state.activeDayKey) {
        state.activeDayKey = NEXT_DAY_KEY;
        options.onDayChanged();
    }
}

function visibilityChangeHandler(
    options: ResolvedDayRolloverOptions,
    checkForDayChange: () => void,
): () => void {
    return (): void => {
        if (options.document.visibilityState !== "visible") {
            return;
        }
        checkForDayChange();
    };
}

function disposeDayRollover(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
    onVisibilityChange: () => void,
): void {
    if (state.timeoutId !== null) {
        options.clearTimeout(state.timeoutId);
    }
    options.document.removeEventListener("visibilitychange", onVisibilityChange);
}

/**
 * Binds a daily rollover watcher that triggers a callback when the local day changes.
 * @example
 * bindTodayDayRollover({ onDayChanged: () => console.log('day changed') })
 * { checkForDayChange: [Function], dispose: [Function] }
 * @param options - Options for configuring the rollover watcher.
 * @param options.document - Optional document-like object to observe visibility; defaults to window.document.
 * @param options.now - Optional function that returns the current Date; defaults to () => new Date().
 * @param options.onDayChanged - Callback invoked when the day key changes.
 * @param options.readDayKey - Optional function that returns the current "day key"; defaults to todayKey.
 * @param options.clearTimeout - Optional clearTimeout implementation; defaults to global clearTimeout.
 * @param options.setTimeout - Optional setTimeout implementation; defaults to global setTimeout.
 * @returns Returns a controller with checkForDayChange() to trigger an immediate check and dispose() to stop timers and listeners.
 **/
export function bindTodayDayRollover(options: DayRolloverOptions): {
    checkForDayChange(): void;
    dispose(): void;
} {
    const RESOLVED = resolvedDayRolloverOptions(options);
    const STATE = createDayRolloverState(RESOLVED.readDayKey);
    const CHECK_FOR_DAY_CHANGE = (): void => {
        handleDayChange(STATE, RESOLVED);
        scheduleNextDayCheck(STATE, RESOLVED, CHECK_FOR_DAY_CHANGE);
    };
    const HANDLE_VISIBILITY_CHANGE = visibilityChangeHandler(
        RESOLVED,
        CHECK_FOR_DAY_CHANGE,
    );
    scheduleNextDayCheck(STATE, RESOLVED, CHECK_FOR_DAY_CHANGE);
    RESOLVED.document.addEventListener(
        "visibilitychange",
        HANDLE_VISIBILITY_CHANGE,
    );

    return {
        checkForDayChange: CHECK_FOR_DAY_CHANGE,
        dispose(): void {
            disposeDayRollover(STATE, RESOLVED, HANDLE_VISIBILITY_CHANGE);
        },
    };
}
