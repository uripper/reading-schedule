import type { CalendarRowWithFinish } from "../../renderer/calendar/data.js";
import type { DetailInteractionHandlers } from "../../renderer/calendar/details_types.js";

export type MinutesEditorAction = "edit" | "cancel" | "saved";

export interface SubmitMinutesUpdateArgs {
  event: SubmitEvent;
  row: CalendarRowWithFinish;
  minutesInput: HTMLInputElement;
  initialMinutesValue: string;
  interactionHandlers: DetailInteractionHandlers;
}
