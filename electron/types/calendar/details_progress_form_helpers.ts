import type { CalendarRowWithFinish } from "../../renderer/calendar/data.js";
import type { DetailInteractionHandlers } from "../../renderer/calendar/details_types.js";

export interface SubmitProgressUpdateArgs {
  event: SubmitEvent;
  row: CalendarRowWithFinish;
  pagesInput: HTMLInputElement;
  pctInput: HTMLInputElement;
  initialPagesValue: string;
  initialPercentValue: string;
  interactionHandlers: DetailInteractionHandlers;
}
