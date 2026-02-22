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
 *
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
 *
 * @param args
 */
export function createAppPlanControllerInstance(
  args: CreatePlanControllerArgs,
): ReturnType<typeof createPlanController> {
  return createPlanController(args);
}

/**
 *
 * @param root0
 * @param root0.saved
 * @param root0.setReady
 * @param root0.queuePersist
 * @param root0.queueAutoPlan
 * @param root0.setStatus
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
 *
 * @param args
 */
export function bindTodayActions(args: BindTodayActionsArgs): void {
  bindTodayFocusActions(args);
}
