import type { Book } from "./types_books.js";
import type { PlannerApi, PlannerSettings } from "./types_planner.js";
import type {
  PlannerScheduleRow,
  PlannerResult,
  PlannerSummary,
} from "./types_planner.js";
import type { Session } from "./types_core.js";

export interface RunPlanGenerationArgs {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  setStatus(this: void, message: string, isError?: boolean): void;
  addLog(this: void, message: string): void;
  announce(
    this: void,
    message: string,
    politeness?: "polite" | "assertive",
  ): void;
  onSuccess(
    this: void,
    data: Pick<PlannerResult, "schedule" | "summary">,
  ): Promise<void>;
  statusGeneratingMessage?: string;
  statusSuccessMessage?: string;
  successAnnouncement?: string;
}

export interface PlanControllerArgs {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  setStatus(this: void, message: string, isError?: boolean): void;
  addLog(this: void, message: string): void;
  announce(
    this: void,
    message: string,
    politeness?: "polite" | "assertive",
  ): void;
  getLastResult(this: void): PlannerResult | null;
  setLastResult(this: void, result: PlannerResult): void;
  getSessions(this: void): Session[];
  getScheduleCompletions(this: void): Record<string, boolean>;
  getBlockedDayBooks(this: void): Record<string, boolean>;
  setScheduleCompletions(
    this: void,
    completions: Record<string, boolean>,
  ): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(
    this: void,
    summary: PlannerSummary | null,
  ): Record<string, number>;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  updateTodayView(this: void): void;
  persistDraft(this: void): Promise<boolean>;
}

export interface PlanController {
  applyLoadedResult(savedResult: PlannerResult | null): void;
  queueAutoPlan(): void;
}

export interface AutoPlanRunner {
  queueAutoPlan(): void;
}

export interface AutoPlanState {
  autoRunPending: boolean;
  autoRunInFlight: boolean;
}

export interface RunAutoPlanFactoryArgs extends PlanControllerArgs {
  state: AutoPlanState;
  scheduleAutoPlan(this: void, runner: () => Promise<void>): void;
}
