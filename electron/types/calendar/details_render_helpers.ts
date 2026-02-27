import type { CalendarRowWithFinish } from "../../renderer/calendar/data.js";
import type { DayMode, DetailInteractionHandlers } from "../../renderer/calendar/details_helpers.js";
import type { CalendarStateSubset } from "../../renderer/calendar/details_types.js";

export type CalendarDetailsState = CalendarStateSubset & {
  selectedDate: string;
  dates: Record<string, CalendarRowWithFinish[]>;
  expectedFinishHighlightDate: string;
};

export interface RowNodeForModeArgs {
  mode: DayMode;
  row: CalendarRowWithFinish;
  state: CalendarDetailsState;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
}
