import type { AppRuntimeState } from "../runtime_state.js";

interface AutoPlanController {
  queueAutoPlan(): void;
}

interface InitRuntimeArgs {
  focusCalendarToday(): void;
  queuePersist(): void;
  state: AppRuntimeState;
  updateDashboards(): void;
}

/**
 * Creates runtime handlers used by tab changes, book edits, and schedule mutations.
 * @param root0 Runtime dependencies from bootstrap.
 * @param root0.focusCalendarToday Focuses/selects today's calendar entry.
 * @param root0.queuePersist Schedules persistence for changed inputs.
 * @param root0.state Shared runtime state container.
 * @param root0.updateDashboards Refreshes dashboard UI sections.
 * @returns Handler object consumed by initialization and bindings.
 */
export function createInitRuntime({
  focusCalendarToday,
  queuePersist,
  state,
  updateDashboards,
}: InitRuntimeArgs): {
  handleBooksChanged(): void;
  handleScheduleMutation(): void;
  handleTabChange(name: string): void;
  queueAutoPlanIfReady(): void;
  setPlanController(controller: AutoPlanController | null): void;
} {
  let planController: AutoPlanController | null = null;
  const queueAutoPlanIfReady = () => {
    if (state.ready && planController) {
      planController.queueAutoPlan();
    }
  };
  const handleTabChange = (name: string) => {
    if (name === "schedule") {
      focusCalendarToday();
    }
  };
  const handleBooksChanged = () => {
    updateDashboards();
    queuePersist();
    queueAutoPlanIfReady();
  };
  const handleScheduleMutation = () => {
    updateDashboards();
    queueAutoPlanIfReady();
  };
  return {
    handleBooksChanged,
    handleScheduleMutation,
    handleTabChange,
    queueAutoPlanIfReady,
    setPlanController: (controller) => {
      planController = controller;
    },
  };
}
