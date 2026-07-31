import { logDebug } from "../../../types/logger.ts";
import type {
    CreatePlanControllerArgs,
    FinalizeInitialLoadArgs,
} from "../../../types/types.ts";
import { el } from "../../dom.ts";
import { readLoadedResult, toSavedRecord } from "../load_state_compat.ts";
import { createPlanController } from "../plan_controller.ts";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.ts";

const SUPPRESSED_LOADED_STATUS_WARNING_CODES = new Set<
    FinalizeInitialLoadArgs["loadResult"]["warningCode"]
>(["RECOVERED_FROM_BACKUP", "RECOVERED_FROM_JOURNAL", "STATE_RESET_FRESH"]);

/**
 * Indicates whether startup should show generic "loaded" status text.
 * @param args - Finalize-initial-load arguments.
 * @returns True when generic loaded status should be displayed.
 */
function shouldShowLoadedStatus(args: FinalizeInitialLoadArgs): boolean {
    return !SUPPRESSED_LOADED_STATUS_WARNING_CODES.has(
        args.loadResult.warningCode,
    );
}

/**
 * Returns true when loaded payload contains one or more persisted schedule rows.
 * @param saved - Loaded persisted payload from startup state load.
 * @returns True when canonical or legacy planner result schedule rows exist.
 */
function hasSavedSchedule(saved: FinalizeInitialLoadArgs["saved"]): boolean {
    const LOADED_RESULT = readLoadedResult(saved, toSavedRecord(saved));
    const ROWS = LOADED_RESULT?.schedule;
    return Array.isArray(ROWS) && ROWS.length > 0;
}

/**
 * Wires the skip-link element to focus the main content region.
 */
export function setupSkipLink(): void {
    const SKIP_LINK = document.querySelector(".skip-link");
    if (!SKIP_LINK) {
        return;
    }
    SKIP_LINK.addEventListener("click", (event) => {
        event.preventDefault();
        el("mainContent").focus();
    });
}

/**
 * Creates the app plan-controller instance from prepared dependencies.
 * @param args - Dependencies required by `createPlanController`.
 * @returns Initialized plan-controller instance.
 */
export function createAppPlanControllerInstance(
    args: CreatePlanControllerArgs,
): ReturnType<typeof createPlanController> {
    return createPlanController(args);
}

/**
 * Finalizes post-load wiring and queues a replan after state is fully loaded.
 * @param args - Initial-load completion dependencies.
 * @param saved - Loaded persisted payload, if available.
 * @param setReady - Marks runtime ready state.
 * @param queuePersist - Schedules persistence of form changes.
 * @param queueAutoPlan - Schedules an automatic plan generation.
 * @param setStatus - Sets startup status text.
 */
export function finalizeInitialLoad(args: FinalizeInitialLoadArgs): void {
    const QUEUE_PERSIST = (): void => {
        args.queuePersist();
    };
    const QUEUE_AUTO_PLAN = (): void => {
        args.queueAutoPlan();
    };
    const SETTINGS_PANEL = el("tab-settings");
    args.setReady();
    logLoadingSetEventListeners(args, QUEUE_PERSIST);

    bindSettingsAutoPlanListeners(SETTINGS_PANEL, () => true, QUEUE_AUTO_PLAN);

    setLoadStatus(args);

    logAutoStartup(args);
    args.addLog?.("Queued startup reschedule.");
    QUEUE_AUTO_PLAN();
}

function logLoadingSetEventListeners(
    args: FinalizeInitialLoadArgs,
    queuePersist: () => void,
) {
    logDebug("Initial load finalized and runtime marked ready.", {
        hasSavedPayload: Boolean(args.saved),
        loadSource: args.loadResult.source,
        warningCode: args.loadResult.warningCode,
    });
    document.addEventListener("input", queuePersist);
    document.addEventListener("change", queuePersist);
}

function logAutoStartup(args: FinalizeInitialLoadArgs) {
    const HAS_SAVED_SCHEDULE = hasSavedSchedule(args.saved);
    logDebug("Evaluated startup auto-plan decision.", {
        hasSavedSchedule: HAS_SAVED_SCHEDULE,
        loadSource: args.loadResult.source,
        shouldAutoPlan: true,
    });
}

function setLoadStatus(args: FinalizeInitialLoadArgs) {
    if (shouldShowLoadedStatus(args)) {
        if (args.saved) {
            args.setStatus("Loaded saved data.");
        } else {
            args.setStatus("Loaded sample data.");
        }
    }
}
