import type { AppCalendarInteractionArgs } from "../../../renderer/app/calendar_interactions/calendar_interactions_types.js";

export type CalendarInteractionHandlers = Parameters<
  AppCalendarInteractionArgs["configureCalendarInteractions"]
>[0];

export interface CompletionRow {
  date?: string;
  book_id?: string;
  title?: string;
}
