import type { PlannerResult } from "../../types.js";

export interface LoadedResultController {
  applyLoadedResult(result: PlannerResult): void;
}
