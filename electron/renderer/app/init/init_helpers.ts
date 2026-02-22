import { el } from "../../dom.js";
import type { Session } from "../../sessions/normalize.js";
import { createPlanController } from "../plan_controller.js";
import { bindSettingsAutoPlanListeners } from "../runtime_helpers.js";
import type { PlannerResult } from "../types.js";
import { bindTodayFocusActions } from "../today/today_focus_bindings.js";

type SetStatus = (message: string, isError?: boolean) => void;

type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

type FinalizeInitialLoadArgs = {
  saved: { last_result?: PlannerResult | null } | null | undefined;
  setReady: () => void;
  queuePersist: () => void;
  queueAutoPlan: () => void;
  setStatus: SetStatus;
};

type BindTodayActionsArgs = {
  getLastResult: () => PlannerResult | null;
  getScheduleCompletions: () => Record<string, boolean>;
  setScheduleCompletions: (nextCompletions: Record<string, boolean>) => void;
  getSessions: () => Session[];
  setSessions: (nextSessions: Session[]) => void;
  queuePersist: () => void;
  updateTodayView: () => void;
  setStatus: SetStatus;
};

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

export function createAppPlanControllerInstance(
  args: CreatePlanControllerArgs,
): ReturnType<typeof createPlanController> {
  return createPlanController(args);
}

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

export function bindTodayActions(args: BindTodayActionsArgs): void {
  bindTodayFocusActions(args);
}
