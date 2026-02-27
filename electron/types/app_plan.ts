import type { Book } from "./books_types.js";
import type { PlannerApi } from "./planner_api.js";
import type { PlannerResult } from "./planner_result.js";
import type { PlannerSettings } from "./planner_settings.js";

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
