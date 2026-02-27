import type { AppCalendarInteractionArgs } from "../../../renderer/app/calendar_interactions/calendar_interactions_types.js";

export type CalendarInteractionHandlers = Parameters<
  AppCalendarInteractionArgs["configureCalendarInteractions"]
>[0];

export type ScheduleMutationHandlers = Pick<
  CalendarInteractionHandlers,
  "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
>;

export interface SharedScheduleBindings {
  collectSettings: AppCalendarInteractionArgs["collectSettings"];
  getBookById: AppCalendarInteractionArgs["getBookById"];
  onScheduleRowsUpdated(this: void): void;
  queuePersist(this: void): void;
  renderCalendar: AppCalendarInteractionArgs["renderCalendar"];
  setBookScheduleRows: AppCalendarInteractionArgs["setBookScheduleRows"];
  setLastResult: AppCalendarInteractionArgs["setLastResult"];
  setStatus: AppCalendarInteractionArgs["setStatus"];
  state: AppCalendarInteractionArgs["state"];
  totalsFromSummary: AppCalendarInteractionArgs["totalsFromSummary"];
}
