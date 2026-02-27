
import type { AutoPlanController, InitRuntimeArgs } from "../../../types/app/init/init_runtime.js";

/**
 * Creates runtime handlers used by tab changes, book edits, and schedule mutations.
 * @param args Runtime dependencies from bootstrap.
 * @param args.focusCalendarToday Focuses/selects today's calendar entry.
 * @param args.queuePersist Schedules persistence for changed inputs.
 * @param args.state Shared runtime state container.
 * @param args.updateDashboards Refreshes dashboard UI sections.
 * @returns Handler object consumed by initialization and bindings.
 */
export function createInitRuntime(args: InitRuntimeArgs): {
  handleBooksChanged(): void;
  handleScheduleMutation(): void;
  handleTabChange(name: string): void;
  queueAutoPlanIfReady(): void;
  setPlanController(controller: AutoPlanController | null): void;
} {
  let planController: AutoPlanController | null = null;
  const queueAutoPlanIfReady = (): void => {
    if (args.state.ready && planController !== null) {
      planController.queueAutoPlan();
    }
  };
  const handleTabChange = (name: string): void => {
    if (name === "schedule") {
      args.focusCalendarToday();
    }
  };
  const handleBooksChanged = (): void => {
    args.updateDashboards();
    args.queuePersist();
    queueAutoPlanIfReady();
  };
  const handleScheduleMutation = (): void => {
    args.updateDashboards();
    queueAutoPlanIfReady();
  };
  const setPlanController = (controller: AutoPlanController | null): void => {
    planController = controller;
  };
  return {
    handleBooksChanged,
    handleScheduleMutation,
    handleTabChange,
    queueAutoPlanIfReady,
    setPlanController,
  };
}
