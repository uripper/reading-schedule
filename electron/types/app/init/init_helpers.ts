import type { createPlanController } from "../../../renderer/app/plan_controller.js";
import type { Session } from "../../../renderer/sessions/normalize.js";
import type { PlannerResult } from "../../types.js";

export type SetStatus = (message: string, isError?: boolean) => void;

export type CreatePlanControllerArgs = Parameters<typeof createPlanController>[0];

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
