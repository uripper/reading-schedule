import type {
    AddManualSessionArgs,
    RemoveSessionArgs,
    UpdateSessionMinutesArgs,
} from "../../../types/types.ts";
import {
    finalizeManualSessionAdd,
    prepareManualSessionAdd,
} from "./calendar-interactions-manual-session-update-helpers.ts";
import {
    finalizeRemovedSession,
    finalizeUpdatedSessionMinutes,
    prepareRemovedSession,
    prepareUpdatedSessionMinutes,
} from "./calendar-interactions-schedule-update-helpers.ts";

export function addManualSessionRow(options: AddManualSessionArgs): boolean {
    const RESULT = prepareManualSessionAdd(options);
    if (RESULT === null) {
        return false;
    }
    finalizeManualSessionAdd(options, RESULT);
    return true;
}

export function removeSessionRow(options: RemoveSessionArgs): boolean {
    const RESULT = prepareRemovedSession(options);
    if (RESULT === null) {
        return false;
    }
    finalizeRemovedSession(options, RESULT);
    return true;
}

export function updateSessionRowMinutes(
    options: UpdateSessionMinutesArgs,
): boolean {
    const RESULT = prepareUpdatedSessionMinutes(options);
    if (RESULT === null) {
        return false;
    }
    finalizeUpdatedSessionMinutes(options, RESULT);
    return true;
}
