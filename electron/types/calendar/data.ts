import type { PlannerScheduleRow } from "../types.js";
import type { CompletionChecker } from "./estimates.js";
export type { CompletionChecker };

export type CalendarRow = PlannerScheduleRow;

export type CalendarRowWithFinish = CalendarRow & {
  finish: boolean;
};

export type RowsByDate = Record<string, CalendarRowWithFinish[]>;
