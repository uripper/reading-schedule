import { el } from "../../dom.js";

import { createPlanController } from "../plan_controller.js";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.js";

import { bindTodayFocusActions } from "../today/index.js";
import type { BindTodayActionsArgs, CreatePlanControllerArgs, FinalizeInitialLoadArgs } from "../../../types/types_app.js";

/**
 * Indicates whether startup should show generic "loaded" status text.
 * @param args Finalize-initial-load arguments.
 * @returns True when generic loaded status should be displayed.
 */
function shouldShowLoadedStatus(args: FinalizeInitialLoadArgs): boolean {
  const warningCode = args.loadResult.warningCode;
  if (warningCode === "RECOVERED_FROM_BACKUP") {
    return false;
  }
  if (warningCode === "RECOVERED_FROM_JOURNAL") {
    return false;
  }
  if (warningCode === "STATE_RESET_FRESH") {
    return false;
  }
  return true;
}

/**
 * Returns true when loaded payload contains one or more persisted schedule rows.
 * @param saved Loaded persisted payload from startup state load.
 * @returns True when `last_result.schedule` exists and has rows.
 */
function hasSavedSchedule(
  saved: FinalizeInitialLoadArgs["saved"],
): boolean {
  const rows = saved?.last_result?.schedule;
  if (!Array.isArray(rows)) {
    return false;
  }
  if (rows.length < 1) {
    return false;
  }
  return true;
}

/**
 * Determines whether startup should queue an immediate auto-plan run.
 * @param saved Loaded persisted payload from startup state load.
 * @param loadResult Structured load metadata including source/warnings.
 * @returns True when startup should auto-plan; false when loaded plan should be preserved.
 */
export function shouldAutoPlanOnStartup(
  saved: FinalizeInitialLoadArgs["saved"],
  loadResult: FinalizeInitialLoadArgs["loadResult"],
): boolean {
  if (loadResult.source === "fresh") {
    return true;
  }
  if (hasSavedSchedule(saved)) {
    return false;
  }
  return true;
}

/**
 * Wires the skip-link element to focus the main content region.
 */
export function setupSkipLink(): void {
  const skipLink = document.querySelector(".skip-link");
  if (!skipLink) {
    return;
  }
  skipLink.addEventListener("click", (event) => {
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
  const queuePersist = (): void => {
    args.queuePersist();
  };
  const queueAutoPlan = (): void => {
    args.queueAutoPlan();
  };
  args.setReady();
  document.addEventListener("input", queuePersist);
  document.addEventListener("change", queuePersist);

  const settingsPanel = el("tab-settings");
  bindSettingsAutoPlanListeners(settingsPanel, () => true, queueAutoPlan);

  if (shouldShowLoadedStatus(args)) {
    if (args.saved) {
      args.setStatus("Loaded saved data.");
    } else {
      args.setStatus("Loaded sample data.");
    }
  }
  if (shouldAutoPlanOnStartup(args.saved, args.loadResult)) {
    queueAutoPlan();
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
