import type { Book } from "../../renderer/books/types.js";
import type { PlannerApi, PlannerResult, PlannerSettings } from "../types.js";

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
