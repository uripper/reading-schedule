import { el } from "../../dom.js";
import type { Session } from "../../sessions/normalize.js";
import { createPlanController } from "../plan_controller.js";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.js";
import type { PlannerResult } from "../types.js";
import { bindTodayFocusActions } from "../today/index.js";

type SetStatus = (message: string, isError?: boolean) => void;

type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

interface FinalizeInitialLoadArgs {
  saved: { last_result?: PlannerResult | null } | null | undefined;
  setReady(): void;
  queuePersist(): void;
  queueAutoPlan(): void;
  setStatus: SetStatus;
}

interface BindTodayActionsArgs {
  getLastResult(): PlannerResult | null;
  getScheduleCompletions(): Record<string, boolean>;
  setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
  getSessions(): Session[];
  setSessions(nextSessions: Session[]): void;
  queuePersist(): void;
  updateTodayView(): void;
  setStatus: SetStatus;
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
 * @param root0 Initial-load completion dependencies.
 * @param root0.saved Loaded persisted payload, if available.
 * @param root0.setReady Marks runtime ready state.
 * @param root0.queuePersist Schedules persistence of form changes.
 * @param root0.queueAutoPlan Schedules an automatic plan generation.
 * @param root0.setStatus Sets startup status text.
 */
export function finalizeInitialLoad({
  saved,
  setReady,
  queuePersist,
  queueAutoPlan,
  setStatus,
}: FinalizeInitialLoadArgs): void {
  setReady();
  document.addEventListener("input", queuePersist);
  document.addEventListener("change", queuePersist);

  const settingsPanel = el("tab-settings");
  bindSettingsAutoPlanListeners(settingsPanel, () => true, queueAutoPlan);

  if (saved) {
    setStatus("Loaded saved data.");
  } else {
    setStatus("Loaded sample data.");
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
