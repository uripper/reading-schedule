import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { normalizedManualMinutes } from "../app/calendar_interactions_helpers.js";
import { parseOptionalNumber } from "./utils.js";

const MIN_PLANNED_MINUTES = normalizedManualMinutes(0);
const EDIT_MINUTES_BUTTON_LABEL = "Edit planned minutes";
const EDIT_MINUTES_BUTTON_ICON = "✎";
const SAVE_MINUTES_BUTTON_LABEL = "Save minutes";
const CANCEL_MINUTES_BUTTON_LABEL = "Cancel";
const PLANNED_MINUTES_PLACEHOLDER = "Planned minutes";

export const MINUTES_EDITOR_OPEN_BY_DEFAULT = false;
export type MinutesEditorAction = "edit" | "cancel" | "saved";

function inputValue(inputNode: HTMLInputElement): string {
  return String(inputNode.value ?? "").trim();
}

function summaryValueFromInput(rawValue: string): number {
  const parsed = parseOptionalNumber(rawValue);
  if (parsed === null) {
    return MIN_PLANNED_MINUTES;
  }
  return normalizedManualMinutes(parsed);
}

function changedNumberValue(
  inputNode: HTMLInputElement,
): number | null {
  return parseOptionalNumber(inputValue(inputNode));
}

function syncInputValue(
  inputNode: HTMLInputElement,
  nextValue?: number | null,
): string {
  if (nextValue === null || nextValue === undefined) {
    return String(inputNode.value ?? "").trim();
  }
  inputNode.value = String(nextValue);
  return String(inputNode.value ?? "").trim();
}

export function plannedMinutesSummaryText(minutes: number): string {
  const normalizedMinutes = normalizedManualMinutes(minutes);
  return `${normalizedMinutes} minutes`;
}

export function nextMinutesEditorOpenState(
  action: MinutesEditorAction,
): boolean {
  if (action === "edit") {
    return true;
  }
  return false;
}

function syncEditorVisibility(
  minutesForm: HTMLFormElement,
  editButton: HTMLButtonElement,
  isOpen: boolean,
): void {
  minutesForm.hidden = !isOpen;
  editButton.hidden = isOpen;
}

function syncSummaryText(
  summaryNode: HTMLElement,
  minutesValue: string,
): void {
  summaryNode.textContent = plannedMinutesSummaryText(
    summaryValueFromInput(minutesValue),
  );
}

function submitMinutesUpdate(
  event: SubmitEvent,
  row: CalendarRowWithFinish,
  minutesInput: HTMLInputElement,
  initialMinutesValue: string,
  interactionHandlers: DetailInteractionHandlers,
): { initialMinutesValue: string; applied: boolean } {
  event.preventDefault();
  const currentMinutesValue = inputValue(minutesInput);
  if (currentMinutesValue === initialMinutesValue) {
    return { initialMinutesValue, applied: false };
  }
  const changedMinutes = changedNumberValue(minutesInput);
  if (changedMinutes === null) {
    minutesInput.value = initialMinutesValue;
    return { initialMinutesValue, applied: false };
  }
  const nextMinutes = normalizedManualMinutes(changedMinutes);
  const applied = interactionHandlers.onSessionMinutesUpdated({
    minutes: nextMinutes,
    row,
  });
  if (!applied) {
    minutesInput.value = initialMinutesValue;
    return { initialMinutesValue, applied: false };
  }
  const nextValue = syncInputValue(minutesInput, nextMinutes);
  return { initialMinutesValue: nextValue, applied: true };
}

export function minutesFormForSession(
  row: CalendarRowWithFinish,
  interactionHandlers: DetailInteractionHandlers,
  onMinutesApplied: () => void,
): HTMLElement {
  const minutesContainer = document.createElement("section");
  minutesContainer.className = "day-minutes-editor";
  const summaryRow = document.createElement("div");
  summaryRow.className = "day-minutes-summary";
  const summaryValue = document.createElement("strong");
  summaryValue.className = "day-minutes-value";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn-minutes-edit";
  editButton.textContent = EDIT_MINUTES_BUTTON_ICON;
  editButton.setAttribute("aria-label", EDIT_MINUTES_BUTTON_LABEL);
  editButton.title = EDIT_MINUTES_BUTTON_LABEL;
  summaryRow.append(summaryValue, editButton);

  const minutesForm = document.createElement("form");
  minutesForm.className = "day-progress-form day-minutes-form";
  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.min = String(MIN_PLANNED_MINUTES);
  minutesInput.step = "1";
  minutesInput.placeholder = PLANNED_MINUTES_PLACEHOLDER;
  minutesInput.value = String(
    Math.max(MIN_PLANNED_MINUTES, Number(row.minutes || 0)),
  );
  const minutesLabel = document.createElement("label");
  minutesLabel.className = "day-progress-field";
  minutesLabel.textContent = "Planned Minutes";
  minutesLabel.append(minutesInput);
  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn";
  saveBtn.textContent = SAVE_MINUTES_BUTTON_LABEL;
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn";
  cancelBtn.textContent = CANCEL_MINUTES_BUTTON_LABEL;
  const actions = document.createElement("div");
  actions.className = "row";
  actions.append(saveBtn, cancelBtn);
  let initialMinutesValue = String(minutesInput.value ?? "").trim();
  syncSummaryText(summaryValue, initialMinutesValue);
  let isEditorOpen = MINUTES_EDITOR_OPEN_BY_DEFAULT;
  syncEditorVisibility(minutesForm, editButton, isEditorOpen);
  minutesForm.append(minutesLabel, actions);

  editButton.onclick = () => {
    isEditorOpen = nextMinutesEditorOpenState("edit");
    syncEditorVisibility(minutesForm, editButton, isEditorOpen);
    minutesInput.focus();
    minutesInput.select();
  };

  cancelBtn.onclick = () => {
    minutesInput.value = initialMinutesValue;
    isEditorOpen = nextMinutesEditorOpenState("cancel");
    syncEditorVisibility(minutesForm, editButton, isEditorOpen);
    editButton.focus();
  };

  minutesForm.onsubmit = (event) => {
    const updatedValues = submitMinutesUpdate(
      event,
      row,
      minutesInput,
      initialMinutesValue,
      interactionHandlers,
    );
    initialMinutesValue = updatedValues.initialMinutesValue;
    if (updatedValues.applied) {
      syncSummaryText(summaryValue, initialMinutesValue);
      isEditorOpen = nextMinutesEditorOpenState("saved");
      syncEditorVisibility(minutesForm, editButton, isEditorOpen);
      editButton.focus();
      onMinutesApplied();
    }
  };
  minutesContainer.append(summaryRow, minutesForm);
  return minutesContainer;
}
