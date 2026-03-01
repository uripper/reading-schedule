import {
    type BindTodayActionsArgs,
    type CreatePlanControllerArgs,
    type FinalizeInitialLoadArgs,
} from "../../../types/types.js";
import { el } from "../../dom.js";
import { logDebug } from "../../logger.js";
import { createPlanController } from "../plan_controller.js";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.js";
import { bindTodayFocusActions } from "../today/index.js";

const SUPPRESSED_LOADED_STATUS_WARNING_CODES = new Set<
    FinalizeInitialLoadArgs["loadResult"]["warningCode"]
>(["RECOVERED_FROM_BACKUP", "RECOVERED_FROM_JOURNAL", "STATE_RESET_FRESH"]);

/**
 * Indicates whether startup should show generic "loaded" status text.
 * @param args Finalize-initial-load arguments.
 * @returns True when generic loaded status should be displayed.
 */
function shouldShowLoadedStatus(args: FinalizeInitialLoadArgs): boolean {
    return !SUPPRESSED_LOADED_STATUS_WARNING_CODES.has(
        args.loadResult.warningCode,
    );
}

/**
 * Returns true when loaded payload contains one or more persisted schedule rows.
 * @param saved Loaded persisted payload from startup state load.
 * @returns True when `last_result.schedule` exists and has rows.
 */
function hasSavedSchedule(saved: FinalizeInitialLoadArgs["saved"]): boolean {
    const ROWS = saved?.last_result?.schedule;
    return Array.isArray(ROWS) && ROWS.length > 0;
}

/**
 * Determines whether startup should queue an immediate auto-plan run.
 * @param args Startup load context with saved payload and load metadata.
 * @returns True when startup should auto-plan; false when loaded plan should be preserved.
 */
function shouldAutoPlanOnStartup(
    args: Pick<FinalizeInitialLoadArgs, "saved" | "loadResult">,
): boolean {
    if (args.loadResult.source === "fresh") {
        return true;
    }
    return !hasSavedSchedule(args.saved);
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
 * @param args Dependencies required by `createPlanController`.
 * @returns Initialized plan-controller instance.
 */
export function createAppPlanControllerInstance(
    args: CreatePlanControllerArgs,
): ReturnType<typeof createPlanController> {
    return createPlanController(args);
}

/**
 * Finalizes post-load wiring and kicks off auto-plan after initial state load.
 * @param args Initial-load completion dependencies.
 * @param args.saved Loaded persisted payload, if available.
 * @param args.setReady Marks runtime ready state.
 * @param args.queuePersist Schedules persistence of form changes.
 * @param args.queueAutoPlan Schedules an automatic plan generation.
 * @param args.setStatus Sets startup status text.
 */
export function finalizeInitialLoad(args: FinalizeInitialLoadArgs): void {
    const QUEUE_PERSIST = (): void => {
        args.queuePersist();
    };
    const QUEUE_AUTO_PLAN = (): void => {
        args.queueAutoPlan();
    };
    args.setReady();
    logDebug("Initial load finalized and runtime marked ready.", {
        hasSavedPayload: Boolean(args.saved),
        loadSource: args.loadResult.source,
        warningCode: args.loadResult.warningCode,
    });
    document.addEventListener("input", QUEUE_PERSIST);
    document.addEventListener("change", QUEUE_PERSIST);

    const SETTINGS_PANEL = el("tab-settings");
    bindSettingsAutoPlanListeners(SETTINGS_PANEL, () => true, QUEUE_AUTO_PLAN);

    if (shouldShowLoadedStatus(args)) {
        if (args.saved) {
            args.setStatus("Loaded saved data.");
        } else {
            args.setStatus("Loaded sample data.");
        }
    }

    const HAS_SAVED_SCHEDULE = hasSavedSchedule(args.saved);
    const SHOULD_AUTO_PLAN = shouldAutoPlanOnStartup(args);
    logDebug("Evaluated startup auto-plan decision.", {
        hasSavedSchedule: HAS_SAVED_SCHEDULE,
        loadSource: args.loadResult.source,
        shouldAutoPlan: SHOULD_AUTO_PLAN,
    });

    if (SHOULD_AUTO_PLAN) {
        QUEUE_AUTO_PLAN();
        return;
    }
    args.addLog?.("Skipped startup auto-plan to preserve loaded schedule.");
}

/**
 * Binds Today-section runtime actions.
 * @param args Today action getters/setters and update callbacks.
 */
export function bindTodayActions(args: BindTodayActionsArgs): void {
    bindTodayFocusActions(args);
}
