import { el } from "../../dom.js";

import { createPlanController } from "../plan_controller.js";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.js";

import { bindTodayFocusActions } from "../today/index.js";
import type { BindTodayActionsArgs, CreatePlanControllerArgs, FinalizeInitialLoadArgs } from "../../../types/app/init/init_helpers.js";

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

  if (args.saved) {
    args.setStatus("Loaded saved data.");
  } else {
    args.setStatus("Loaded sample data.");
  }
  queueAutoPlan();
}

/**
 * Binds Today-section runtime actions.
 * @param args Today action getters/setters and update callbacks.
 */
export function bindTodayActions(args: BindTodayActionsArgs): void {
  bindTodayFocusActions(args);
}
