import { todayKey } from "../../sessions/utils.ts";

const MIN_DAY_ROLLOVER_DELAY_MS = 1;

// TODO: Move interfaces and types to our contracts package
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

type DayRolloverCallbacks = {
    checkForDayChange: () => void;
    onVisibilityChange: () => void;
};

function nextLocalMidnightDelay(now: Date): number {
    const NEXT_MIDNIGHT = new Date(now);
    NEXT_MIDNIGHT.setHours(24, 0, 0, 0);
    return Math.max(
        MIN_DAY_ROLLOVER_DELAY_MS,
        NEXT_MIDNIGHT.getTime() - now.getTime(),
    );
}

function resolvedRolloverDocument(
    document: DayRolloverDocument | undefined,
): DayRolloverDocument {
    return document ?? globalThis.document;
}

function resolvedRolloverNow(now: (() => Date) | undefined): () => Date {
    if (now !== undefined) {
        return now;
    }
    return () => new Date();
}

function resolvedReadDayKey(
    readDayKey: (() => string) | undefined,
): () => string {
    return readDayKey ?? todayKey;
}

function resolvedClearTimeout(
    clearTimeoutImpl: typeof globalThis.clearTimeout | undefined,
): typeof globalThis.clearTimeout {
    if (clearTimeoutImpl !== undefined) {
        return clearTimeoutImpl;
    }
    return (...args: Parameters<typeof globalThis.clearTimeout>) => {
        return globalThis.clearTimeout(...args);
    };
}

function resolvedSetTimeout(
    setTimeoutImpl: typeof globalThis.setTimeout | undefined,
): typeof globalThis.setTimeout {
    if (setTimeoutImpl !== undefined) {
        return setTimeoutImpl;
    }
    return ((...args: Parameters<typeof globalThis.setTimeout>) => {
        return globalThis.setTimeout(...args);
    }) as typeof globalThis.setTimeout;
}

function resolvedDayRolloverOptions(
    options: DayRolloverOptions,
): ResolvedDayRolloverOptions {
    return {
        clearTimeout: resolvedClearTimeout(options.clearTimeout),
        document: resolvedRolloverDocument(options.document),
        now: resolvedRolloverNow(options.now),
        onDayChanged: options.onDayChanged,
        readDayKey: resolvedReadDayKey(options.readDayKey),
        setTimeout: resolvedSetTimeout(options.setTimeout),
    };
}

function createDayRolloverState(readDayKey: () => string): DayRolloverState {
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
    const STATE = state;
    if (STATE.timeoutId !== null) {
        options.clearTimeout(STATE.timeoutId);
    }
    STATE.timeoutId = options.setTimeout(() => {
        checkForDayChange();
    }, nextLocalMidnightDelay(options.now()));
}

function handleDayChange(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
): void {
    const STATE = state;
    const NEXT_DAY_KEY = options.readDayKey();
    if (NEXT_DAY_KEY !== STATE.activeDayKey) {
        STATE.activeDayKey = NEXT_DAY_KEY;
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
    options.document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
    );
}

function dayRolloverCallbacks(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
): DayRolloverCallbacks {
    const CHECK_FOR_DAY_CHANGE = (): void => {
        handleDayChange(state, options);
        scheduleNextDayCheck(state, options, CHECK_FOR_DAY_CHANGE);
    };
    return {
        checkForDayChange: CHECK_FOR_DAY_CHANGE,
        onVisibilityChange: visibilityChangeHandler(
            options,
            CHECK_FOR_DAY_CHANGE,
        ),
    };
}

function startDayRollover(
    state: DayRolloverState,
    options: ResolvedDayRolloverOptions,
): DayRolloverCallbacks {
    const CALLBACKS = dayRolloverCallbacks(state, options);
    scheduleNextDayCheck(state, options, CALLBACKS.checkForDayChange);
    options.document.addEventListener(
        "visibilitychange",
        CALLBACKS.onVisibilityChange,
    );
    return CALLBACKS;
}

function dayRolloverController(args: {
    state: DayRolloverState;
    options: ResolvedDayRolloverOptions;
    callbacks: DayRolloverCallbacks;
}): {
    checkForDayChange(): void;
    dispose(): void;
} {
    return {
        checkForDayChange: args.callbacks.checkForDayChange,
        dispose(): void {
            disposeDayRollover(
                args.state,
                args.options,
                args.callbacks.onVisibilityChange,
            );
        },
    };
}

/**
 * Binds a daily rollover watcher that triggers a callback when the local day changes.
 * @example
 * bindTodayDayRollover({ onDayChanged: refreshTodayForNewDay })
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
    const CALLBACKS = startDayRollover(STATE, RESOLVED);
    return dayRolloverController({
        callbacks: CALLBACKS,
        options: RESOLVED,
        state: STATE,
    });
}
