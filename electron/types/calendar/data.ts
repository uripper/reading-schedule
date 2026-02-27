import type { PlannerScheduleRow } from "../types.js";

export type CalendarRow = PlannerScheduleRow;

export type CalendarRowWithFinish = CalendarRow & {
  finish: boolean;
};

export type RowsByDate = Record<string, CalendarRowWithFinish[]>;

export type CompletionChecker = (sessionKey: string) => boolean;
