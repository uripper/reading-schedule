import type { createPlanController } from "../../../renderer/app/plan_controller.js";

import type { Book } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";
import type { AppRuntimeState } from "./app_runtime_state.js";
import type { SetStatus } from "./app_runtime.js";

export type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

export interface AutoPlanController {
  queueAutoPlan(): void;
}

export interface InitRuntimeArgs {
  focusCalendarToday(): void;
  queuePersist(): void;
  state: AppRuntimeState;
  updateDashboards(): void;
}

export interface LoadedResultController {
  applyLoadedResult(result: PlannerResult): void;
}

export interface FinalizeInitialLoadArgs {
  saved: { last_result?: PlannerResult | null } | null | undefined;
  setReady(): void;
  queuePersist(): void;
  queueAutoPlan(): void;
  setStatus: SetStatus;
}

export interface BindTodayActionsArgs {
  getLastResult(): PlannerResult | null;
  getScheduleCompletions(): Record<string, boolean>;
  setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
  getSessions(): Session[];
  setSessions(nextSessions: Session[]): void;
  queuePersist(): void;
  updateTodayView(): void;
  setStatus: SetStatus;
}

export interface DashboardUpdateArgs {
  books: Book[];
  sessions: AppRuntimeState["sessions"];
  lastResult: AppRuntimeState["lastResult"];
  scheduleCompletions: AppRuntimeState["scheduleCompletions"];
  dailyGoalMinutes: number;
}
