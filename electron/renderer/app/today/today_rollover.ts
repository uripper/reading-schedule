import { todayKey } from "../../sessions/utils.js";

const MIN_DAY_ROLLOVER_DELAY_MS = 1;

interface DayRolloverDocument {
    addEventListener(type: "visibilitychange", listener: () => void): void;
    removeEventListener(type: "visibilitychange", listener: () => void): void;
    visibilityState: "hidden" | "visible";
}

function nextLocalMidnightDelay(now: Date): number {
    const NEXT_MIDNIGHT = new Date(now);
    NEXT_MIDNIGHT.setHours(24, 0, 0, 0);
    return Math.max(
        MIN_DAY_ROLLOVER_DELAY_MS,
        NEXT_MIDNIGHT.getTime() - now.getTime(),
    );
}

/**
* Binds a daily rollover watcher that triggers a callback when the local day changes.
* @example
* bindTodayDayRollover({ onDayChanged: () => console.log('day changed') })
* { checkForDayChange: [Function], dispose: [Function] }
* @param {{object}} {{options}} - Options for configuring the rollover watcher.
* @param {{DayRolloverDocument}} {{options.document}} - Optional document-like object to observe visibility; defaults to window.document.
* @param {{function():Date}} {{options.now}} - Optional function that returns the current Date; defaults to () => new Date().
* @param {{function():void}} {{options.onDayChanged}} - Callback invoked when the day key changes.
* @param {{function():string}} {{options.readDayKey}} - Optional function that returns the current "day key"; defaults to todayKey.
* @param {{function(number):void}} {{options.clearTimeout}} - Optional clearTimeout implementation; defaults to global clearTimeout.
* @param {{function(function, number): any}} {{options.setTimeout}} - Optional setTimeout implementation; defaults to global setTimeout.
* @returns {{object}} Returns a controller with checkForDayChange() to trigger an immediate check and dispose() to stop timers and listeners.
**/
export function bindTodayDayRollover(options: {
    document?: DayRolloverDocument;
    now?: () => Date;
    onDayChanged(): void;
    readDayKey?: () => string;
    clearTimeout?: typeof globalThis.clearTimeout;
    setTimeout?: typeof globalThis.setTimeout;
}): {
    checkForDayChange(): void;
    dispose(): void;
} {
    const CLEAR_TIMEOUT = options.clearTimeout ?? globalThis.clearTimeout;
    const DOCUMENT = options.document ?? globalThis.document;
    const NOW = options.now ?? (() => new Date());
    const READ_DAY_KEY = options.readDayKey ?? todayKey;
    const SET_TIMEOUT = options.setTimeout ?? globalThis.setTimeout;
    let activeDayKey = READ_DAY_KEY();
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

    const SCHEDULE_NEXT_CHECK = (): void => {
        if (timeoutId !== null) {
            CLEAR_TIMEOUT(timeoutId);
        }
        timeoutId = SET_TIMEOUT(() => {
            CHECK_FOR_DAY_CHANGE();
        }, nextLocalMidnightDelay(NOW()));
    };

    const CHECK_FOR_DAY_CHANGE = (): void => {
        const NEXT_DAY_KEY = READ_DAY_KEY();
        if (NEXT_DAY_KEY !== activeDayKey) {
            activeDayKey = NEXT_DAY_KEY;
            options.onDayChanged();
        }
        SCHEDULE_NEXT_CHECK();
    };

    const HANDLE_VISIBILITY_CHANGE = (): void => {
        if (DOCUMENT.visibilityState !== "visible") {
            return;
        }
        CHECK_FOR_DAY_CHANGE();
    };

    SCHEDULE_NEXT_CHECK();
    DOCUMENT.addEventListener("visibilitychange", HANDLE_VISIBILITY_CHANGE);

    return {
        checkForDayChange: CHECK_FOR_DAY_CHANGE,
        dispose(): void {
            if (timeoutId !== null) {
                CLEAR_TIMEOUT(timeoutId);
            }
            DOCUMENT.removeEventListener(
                "visibilitychange",
                HANDLE_VISIBILITY_CHANGE,
            );
        },
    };
}
