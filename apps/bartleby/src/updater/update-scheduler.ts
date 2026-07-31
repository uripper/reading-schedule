/**
 * Schedules update checks at launch, every six hours, and on foreground.
 */

import type {
    AppUpdateScheduler,
    AppUpdateSchedulerOptions,
} from "@reading-schedule/contracts";

const HOURS_PER_CHECK = 6;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const UPDATE_CHECK_INTERVAL_MS =
    HOURS_PER_CHECK *
    MINUTES_PER_HOUR *
    SECONDS_PER_MINUTE *
    MILLISECONDS_PER_SECOND;

/** Starts one check and routes a recoverable failure to the logger. */
function startCheck(
    options: AppUpdateSchedulerOptions,
    markChecked: () => void,
): void {
    markChecked();
    options.controller.checkNow().catch((error: unknown) => {
        options.reportError("App update check failed.", error);
    });
}

/** Creates a visibility callback that checks only when the interval is due. */
function foregroundCheck(
    options: AppUpdateSchedulerOptions,
    lastCheckedAt: () => number,
    markChecked: () => void,
): () => void {
    return (): void => {
        if (options.document.visibilityState !== "visible") {
            return;
        }
        const ELAPSED_MS = options.now() - lastCheckedAt();
        if (ELAPSED_MS < UPDATE_CHECK_INTERVAL_MS) {
            return;
        }
        startCheck(options, markChecked);
    };
}

/** Registers interval and foreground checks and returns the interval handle. */
function registerRecurringChecks(
    options: AppUpdateSchedulerOptions,
    checkIfDue: () => void,
): ReturnType<typeof setInterval> {
    const INTERVAL_ID = globalThis.setInterval(
        checkIfDue,
        UPDATE_CHECK_INTERVAL_MS,
    );
    options.document.addEventListener("visibilitychange", checkIfDue);
    return INTERVAL_ID;
}

/**
 * Starts launch, six-hour, and foreground update checks.
 * @param options - Scheduler clock, document, controller, and logging adapters.
 * @returns Disposable scheduler.
 */
export function startAppUpdateScheduler(
    options: AppUpdateSchedulerOptions,
): AppUpdateScheduler {
    let lastCheckedAtMs = 0;
    const MARK_CHECKED = (): void => {
        lastCheckedAtMs = options.now();
    };
    const CHECK_IF_DUE = foregroundCheck(
        options,
        (): number => lastCheckedAtMs,
        MARK_CHECKED,
    );
    startCheck(options, MARK_CHECKED);
    const INTERVAL_ID = registerRecurringChecks(options, CHECK_IF_DUE);
    return {
        dispose: (): void => {
            globalThis.clearInterval(INTERVAL_ID);
            options.document.removeEventListener(
                "visibilitychange",
                CHECK_IF_DUE,
            );
        },
    };
}
