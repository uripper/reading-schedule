import type { PlannerScheduleRow } from "../../types.js";

export type UpdatedRowsResult = {
  normalizedMinutes: number;
  rows: PlannerScheduleRow[];
} | null;
