import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { normalizedManualMinutes } from "../app/calendar_interactions/index.js";
import { parseOptionalNumber } from "./utils.js";

const MINUTES_MIN = normalizedManualMinutes(0);
export const MINUTES_EDITOR_OPEN_BY_DEFAULT = false;
export type MinutesEditorAction = "edit" | "cancel" | "saved";

/**
 *
 * @param inputNode
 */
function inputValue(inputNode: HTMLInputElement): string {
  return String(inputNode.value ?? "").trim();
}

/**
 *
 * @param rawValue
 */
function summaryValueFromInput(rawValue: string): number {
  const parsed = parseOptionalNumber(rawValue);
  if (parsed === null) {
    return MINUTES_MIN;
  }
  return normalizedManualMinutes(parsed);
}

/**
 *
 * @param inputNode
 */
function changedNumberValue(inputNode: HTMLInputElement): number | null {
  return parseOptionalNumber(inputValue(inputNode));
}

/**
 *
 * @param inputNode
 * @param nextValue
 */
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

/**
 *
 */
export function minPlannedMinutes(): number {
  return MINUTES_MIN;
}
/**
 *
 * @param minutes
 */
export function plannedMinutesSummaryText(minutes: number): string {
  const normalizedMinutes = normalizedManualMinutes(minutes);
  return `${normalizedMinutes} minutes`;
}

/**
 *
 * @param action
 */
export function nextMinutesEditorOpenState(
  action: MinutesEditorAction,
): boolean {
  if (action === "edit") {
    return true;
  }
  return false;
}

/**
 *
 * @param minutesForm
 * @param editButton
 * @param isOpen
 */
export function syncEditorVisibility(
  minutesForm: HTMLFormElement,
  editButton: HTMLButtonElement,
  isOpen: boolean,
): void {
  minutesForm.hidden = !isOpen;
  editButton.hidden = isOpen;
}
/**
 *
 * @param summaryNode
 * @param minutesValue
 */
export function syncSummaryText(
  summaryNode: HTMLElement,
  minutesValue: string,
): void {
  summaryNode.textContent = plannedMinutesSummaryText(
    summaryValueFromInput(minutesValue),
  );
}

/**
 *
 * @param event
 * @param row
 * @param minutesInput
 * @param initialMinutesValue
 * @param interactionHandlers
 */
export function submitMinutesUpdate(
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
