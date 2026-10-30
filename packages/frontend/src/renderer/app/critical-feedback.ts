/** Connects operation results to independently recoverable error feedback. */
import type { CriticalErrors, SetStatus } from "../../types/types.ts";
import { SAVE_FAILURE_MESSAGE } from "../errors/index.ts";

/** Publishes save failures separately from planner and other status updates. */
export function createPersistFeedback(
    errors: CriticalErrors,
    setStatus: SetStatus,
): (saved: boolean) => void {
    let hasFailed = false;
    return (saved): void => {
        if (saved) {
            hasFailed = false;
            errors.clear("persistence");
            return;
        }
        errors.show("persistence", SAVE_FAILURE_MESSAGE);
        if (!hasFailed) {
            setStatus(SAVE_FAILURE_MESSAGE, true, "error");
        }
        hasFailed = true;
    };
}

/** Mirrors existing status errors to a surface unaffected by save recovery. */
export function createCriticalStatusSetter(
    errors: CriticalErrors,
    setStatus: SetStatus,
): SetStatus {
    return (message, isError, phase): void => {
        setStatus(message, isError, phase);
        if (isError) {
            errors.show("planner", message);
            return;
        }
        if (phase === "success") {
            errors.clear("planner");
        }
    };
}
