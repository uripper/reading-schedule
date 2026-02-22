import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { normalizedManualMinutes } from "../app/calendar_interactions_helpers.js";
import { parseOptionalNumber } from "./utils.js";

const MIN_PLANNED_MINUTES = normalizedManualMinutes(0);

function inputValue(inputNode: HTMLInputElement): string {
  return String(inputNode.value ?? "").trim();
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
): HTMLFormElement {
  const minutesForm = document.createElement("form");
  minutesForm.className = "day-progress-form day-minutes-form";
  const minutesInput = document.createElement("input");
  minutesInput.type = "number";
  minutesInput.min = String(MIN_PLANNED_MINUTES);
  minutesInput.step = "1";
  minutesInput.placeholder = "Planned minutes";
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
  saveBtn.textContent = "Update Minutes";
  let initialMinutesValue = String(minutesInput.value ?? "").trim();
  minutesForm.append(minutesLabel, saveBtn);
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
      onMinutesApplied();
    }
  };
  return minutesForm;
}
