import type { DayMode, DetailInteractionHandlers } from "../../renderer/calendar/details_types.js";

export interface BuildManualSessionAddPanelArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  defaultBookId?: string;
  defaultMinutes?: number;
}

export interface SubmitManualAddFormArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  bookSelect: HTMLSelectElement;
  minutesInput: HTMLInputElement;
  completeInput: HTMLInputElement;
}

export interface BookSelectionControls {
  titleFilterLabel: HTMLLabelElement;
  bookLabel: HTMLLabelElement;
  bookSelect: HTMLSelectElement;
}
