import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { normalizedManualMinutes } from "../app/calendar_interactions/index.js";
import { parseOptionalNumber } from "./utils.js";

const MINUTES_MIN = normalizedManualMinutes(0);
export const MINUTES_EDITOR_OPEN_BY_DEFAULT = false;
export type MinutesEditorAction = "edit" | "cancel" | "saved";

interface SubmitMinutesUpdateArgs {
  event: SubmitEvent;
  row: CalendarRowWithFinish;
  minutesInput: HTMLInputElement;
  initialMinutesValue: string;
  interactionHandlers: DetailInteractionHandlers;
}

/**
 * Reads trimmed value from a minutes input node.
 * @param inputNode Minutes input element.
 * @returns Trimmed input value.
 */
function inputValue(inputNode: HTMLInputElement): string {
  return String(inputNode.value).trim();
}

/**
 * Converts raw input value into normalized summary minutes value.
 * @param rawValue Raw input text.
 * @returns Normalized minutes used in summary label.
 */
function summaryValueFromInput(rawValue: string): number {
  const parsed = parseOptionalNumber(rawValue);
  if (parsed === null) {
    return MINUTES_MIN;
  }
  return normalizedManualMinutes(parsed);
}

/**
 * Parses changed minutes value from input.
 * @param inputNode Minutes input element.
 * @returns Parsed number or `null` when invalid/blank.
 */
function changedNumberValue(inputNode: HTMLInputElement): number | null {
  return parseOptionalNumber(inputValue(inputNode));
}

/**
 * Syncs input element to provided numeric value when present.
 * @param inputNode Minutes input element.
 * @param nextValue Optional next minutes value.
 * @returns Current trimmed input value after sync.
 */
function syncInputValue(
  inputNode: HTMLInputElement,
  nextValue?: number | null,
): string {
  const nextInput = inputNode;
  if (nextValue === null || nextValue === undefined) {
    return String(nextInput.value).trim();
  }
  nextInput.value = String(nextValue);
  return String(nextInput.value).trim();
}

/**
 * Returns minimum allowed planned minutes value.
 * @returns Minimum minutes.
 */
export function minPlannedMinutes(): number {
  return MINUTES_MIN;
}
/**
 * Formats planned-minutes summary label.
 * @param minutes Minutes value.
 * @returns Formatted summary text.
 */
export function plannedMinutesSummaryText(minutes: number): string {
  const normalizedMinutes = normalizedManualMinutes(minutes);
  return `${normalizedMinutes} minutes`;
}

/**
 * Returns next editor-open state for minutes editor action.
 * @param action Minutes editor action.
 * @returns Whether editor should be open.
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
 * Returns whether minutes summary row should be visible.
 * @param isOpen Whether editor is currently open.
 * @returns `true` when summary row should be shown.
 */
export function minutesSummaryVisible(isOpen: boolean): boolean {
  return !isOpen;
}

/**
 * Applies visibility state to minutes form/edit trigger.
 * @param minutesForm Minutes edit form.
 * @param summaryRow Summary row showing current minutes.
 * @param editButton Edit trigger button.
 * @param isOpen Whether editor is open.
 */
export function syncEditorVisibility(
  minutesForm: HTMLFormElement,
  summaryRow: HTMLElement,
  editButton: HTMLButtonElement,
  isOpen: boolean,
): void {
  const nextMinutesForm = minutesForm;
  const nextSummaryRow = summaryRow;
  const nextEditButton = editButton;
  nextMinutesForm.hidden = !isOpen;
  nextSummaryRow.hidden = !minutesSummaryVisible(isOpen);
  nextEditButton.hidden = isOpen;
}
/**
 * Updates planned-minutes summary text from input value.
 * @param summaryNode Summary label node.
 * @param minutesValue Raw minutes input value.
 */
export function syncSummaryText(
  summaryNode: HTMLElement,
  minutesValue: string,
): void {
  const nextSummaryNode = summaryNode;
  nextSummaryNode.textContent = plannedMinutesSummaryText(
    summaryValueFromInput(minutesValue),
  );
}

/**
 * Submits minutes update and returns updated editor state values.
 * @param args Form submission payload for the minutes editor.
 * @param args.event Form submit event.
 * @param args.row Calendar row being edited.
 * @param args.minutesInput Minutes input element.
 * @param args.initialMinutesValue Previous stable minutes value.
 * @param args.interactionHandlers Detail interaction handlers.
 * @returns Updated initial value and whether an update was applied.
 */
export function submitMinutesUpdate(args: SubmitMinutesUpdateArgs): {
  initialMinutesValue: string;
  applied: boolean;
} {
  const { event, row, interactionHandlers, minutesInput, initialMinutesValue } =
    args;
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
