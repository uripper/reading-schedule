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
