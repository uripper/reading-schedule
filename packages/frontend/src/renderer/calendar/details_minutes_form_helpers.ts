import type {
    MinutesEditorAction,
    SubmitMinutesUpdateArgs,
} from "../../types/types.ts";
import { normalizedManualMinutes } from "../app/calendar_interactions/calendar_interactions_manual_helpers.ts";
import { parseOptionalNumber } from "./utils.ts";

const MINUTES_MIN = normalizedManualMinutes(0);
export const MINUTES_EDITOR_OPEN_BY_DEFAULT = false;

interface EditorVisibilityArgs {
    editButton: HTMLButtonElement;
    isOpen: boolean;
    minutesForm: HTMLFormElement;
    summaryRow: HTMLElement;
}

interface SubmitMinutesUpdateResult {
    applied: boolean;
    initialMinutesValue: string;
}

/**
 * Reads trimmed value from a minutes input node.
 * @param inputNode - Minutes input element.
 * @returns Trimmed input value.
 */
function inputValue(inputNode: HTMLInputElement): string {
    return String(inputNode.value).trim();
}

/**
 * Converts raw input value into normalized summary minutes value.
 * @param rawValue - Raw input text.
 * @returns Normalized minutes used in summary label.
 */
function summaryValueFromInput(rawValue: string): number {
    const PARSED = parseOptionalNumber(rawValue);
    if (PARSED === null) {
        return MINUTES_MIN;
    }
    return normalizedManualMinutes(PARSED);
}

/**
 * Parses changed minutes value from input.
 * @param inputNode - Minutes input element.
 * @returns Parsed number or `null` when invalid/blank.
 */
function changedNumberValue(inputNode: HTMLInputElement): number | null {
    return parseOptionalNumber(inputValue(inputNode));
}

/**
 * Syncs input element to provided numeric value when present.
 * @param inputNode - Minutes input element.
 * @param nextValue - Optional next minutes value.
 * @returns Current trimmed input value after sync.
 */
function syncInputValue(
    inputNode: HTMLInputElement,
    nextValue?: number | null,
): string {
    const NEXT_INPUT = inputNode;
    if (nextValue === null || nextValue === undefined) {
        return String(NEXT_INPUT.value).trim();
    }
    NEXT_INPUT.value = String(nextValue);
    return String(NEXT_INPUT.value).trim();
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
 * @param minutes - Minutes value.
 * @returns Formatted summary text.
 */
export function plannedMinutesSummaryText(minutes: number): string {
    const NORMALIZED_MINUTES = normalizedManualMinutes(minutes);
    return `${NORMALIZED_MINUTES} minutes`;
}

/**
 * Returns next editor-open state for minutes editor action.
 * @param action - Minutes editor action.
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
 * @param isOpen - Whether editor is currently open.
 * @returns `true` when summary row should be shown.
 */
export function minutesSummaryVisible(isOpen: boolean): boolean {
    return !isOpen;
}

/**
 * Applies visibility state to minutes form/edit trigger.
 * @param minutesForm - Minutes edit form.
 * @param summaryRow - Summary row showing current minutes.
 * @param editButton - Edit trigger button.
 * @param isOpen - Whether editor is open.
 */
export function syncEditorVisibility({
    editButton,
    isOpen,
    minutesForm,
    summaryRow,
}: EditorVisibilityArgs): void {
    minutesForm.hidden = !isOpen;
    summaryRow.hidden = !minutesSummaryVisible(isOpen);
    editButton.hidden = isOpen;
}
/**
 * Updates planned-minutes summary text from input value.
 * @param summaryNode - Summary label node.
 * @param minutesValue - Raw minutes input value.
 */
export function syncSummaryText(
    summaryNode: HTMLElement,
    minutesValue: string,
): void {
    const NEXT_SUMMARY_NODE = summaryNode;
    NEXT_SUMMARY_NODE.textContent = plannedMinutesSummaryText(
        summaryValueFromInput(minutesValue),
    );
}

/**
 * Submits minutes update and returns updated editor state values.
 * @param args - Form submission payload for the minutes editor.
 * @param applied - Whether update was applied and editor should be updated.
 * @param event - Form submit event.
 * @param row - Calendar row being edited.
 * @param minutesInput - Minutes input element.
 * @param initialMinutesValue - Previous stable minutes value.
 * @param interactionHandlers - Detail interaction handlers.
 * @returns Updated initial value and whether an update was applied.
 */
function rejectedMinutesUpdate(
    minutesInput: HTMLInputElement,
    initialMinutesValue: string,
): SubmitMinutesUpdateResult {
    const NEXT_INPUT = minutesInput;
    NEXT_INPUT.value = initialMinutesValue;
    return { applied: false, initialMinutesValue };
}

function applyMinutesUpdate(
    args: Pick<
        SubmitMinutesUpdateArgs,
        "initialMinutesValue" | "interactionHandlers" | "minutesInput" | "row"
    >,
    nextMinutes: number,
): SubmitMinutesUpdateResult {
    const APPLIED = args.interactionHandlers.onSessionMinutesUpdated({
        minutes: nextMinutes,
        row: args.row,
    });
    if (!APPLIED) {
        return rejectedMinutesUpdate(
            args.minutesInput,
            args.initialMinutesValue,
        );
    }
    const NEXT_VALUE = syncInputValue(args.minutesInput, nextMinutes);
    return { applied: true, initialMinutesValue: NEXT_VALUE };
}

export function submitMinutesUpdate(
    args: SubmitMinutesUpdateArgs,
): SubmitMinutesUpdateResult {
    const {
        event,
        row,
        interactionHandlers,
        minutesInput,
        initialMinutesValue,
    } = args;
    event.preventDefault();
    const CURRENT_MINUTES_VALUE = inputValue(minutesInput);
    if (CURRENT_MINUTES_VALUE === initialMinutesValue) {
        return { applied: false, initialMinutesValue };
    }
    const CHANGED_MINUTES = changedNumberValue(minutesInput);
    if (CHANGED_MINUTES === null) {
        return rejectedMinutesUpdate(minutesInput, initialMinutesValue);
    }
    return applyMinutesUpdate(
        { initialMinutesValue, interactionHandlers, minutesInput, row },
        normalizedManualMinutes(CHANGED_MINUTES),
    );
}
