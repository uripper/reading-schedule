import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { parseOptionalNumber } from "./utils.js";

const MIN_PLANNED_MINUTES = 1;

function changedNumberValue(
  inputNode: HTMLInputElement,
  initialValue: string,
): number | null {
  const currentValue = String(inputNode.value ?? "").trim();
  if (currentValue === String(initialValue)) {
    return null;
  }
  return parseOptionalNumber(currentValue);
}

function normalizedMinutes(minutes: number | null): number | null {
  if (minutes === null) {
    return null;
  }
  const rounded = Math.round(minutes);
  if (!Number.isFinite(rounded) || rounded < MIN_PLANNED_MINUTES) {
    return null;
  }
  return rounded;
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
  const changedMinutes = changedNumberValue(minutesInput, initialMinutesValue);
  if (changedMinutes === null) {
    return { initialMinutesValue, applied: true };
  }
  const nextMinutes = normalizedMinutes(changedMinutes);
  if (nextMinutes === null) {
    minutesInput.value = initialMinutesValue;
    return { initialMinutesValue, applied: false };
  }
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
  minutesInput.value = String(Math.max(MIN_PLANNED_MINUTES, Number(row.minutes || 0)));
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
