import type { AppRuntimeState } from "../../../renderer/app/runtime_state.js";

export interface AutoPlanController {
  queueAutoPlan(): void;
}

export interface InitRuntimeArgs {
  focusCalendarToday(): void;
  queuePersist(): void;
  state: AppRuntimeState;
  updateDashboards(): void;
}
