import type {
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import {
    minutesFormActions,
    minutesInputForRow,
} from "./details_minutes_form_dom.ts";
import {
    MINUTES_EDITOR_OPEN_BY_DEFAULT,
    nextMinutesEditorOpenState,
    submitMinutesUpdate,
    syncEditorVisibility,
    syncSummaryText,
} from "./details_minutes_form_helpers.ts";

const EDIT_MINUTES_BUTTON_LABEL = "Edit planned minutes";
const EDIT_MINUTES_BUTTON_TEXT = "Edit";

interface MinutesSummaryRow {
    editButton: HTMLButtonElement;
    node: HTMLDivElement;
    summaryValue: HTMLElement;
}

/**
 * Create and return a DOM row that displays a minutes summary value alongside an edit button.
 * @example
 * createMinutesSummaryRow()
 * { editButton: HTMLButtonElement, node: HTMLDivElement, summaryValue: HTMLStrongElement }
 * @returns Returns an object containing the container node, the strong element for the minutes value, and the edit button.
 **/
function createMinutesSummaryRow(): MinutesSummaryRow {
    const SUMMARY_ROW = document.createElement("div");
    SUMMARY_ROW.className = "day-minutes-summary";
    const SUMMARY_VALUE = document.createElement("strong");
    SUMMARY_VALUE.className = "day-minutes-value";
    const EDIT_BUTTON = document.createElement("button");
    EDIT_BUTTON.type = "button";
    EDIT_BUTTON.className = "btn-minutes-edit";
    EDIT_BUTTON.textContent = EDIT_MINUTES_BUTTON_TEXT;
    EDIT_BUTTON.setAttribute("aria-label", EDIT_MINUTES_BUTTON_LABEL);
    EDIT_BUTTON.title = EDIT_MINUTES_BUTTON_LABEL;
    SUMMARY_ROW.append(SUMMARY_VALUE, EDIT_BUTTON);
    return {
        editButton: EDIT_BUTTON,
        node: SUMMARY_ROW,
        summaryValue: SUMMARY_VALUE,
    };
}

interface MinutesEditorBindingsArgs {
    cancelBtn: HTMLButtonElement;
    editButton: HTMLButtonElement;
    interactionHandlers: DetailInteractionHandlers;
    minutesForm: HTMLFormElement;
    minutesInput: HTMLInputElement;
    onMinutesApplied: () => void;
    row: CalendarRowWithFinish;
    summaryRow: HTMLElement;
    summaryValue: HTMLElement;
}

/**
 * Bind UI event handlers for the minutes editor: sync summary text, control editor visibility, and handle edit/cancel/submit actions.
 * @example
 * bindMinutesEditorActions({minutesInput, minutesForm, summaryRow, summaryValue, editButton, cancelBtn, interactionHandlers, row, onMinutesApplied})
 * undefined
 * @param args - Arguments object containing DOM elements and handlers needed to wire the minutes editor.
 * @returns Nothing.
 **/
function bindMinutesEditorActions(args: MinutesEditorBindingsArgs): void {
    let initialMinutesValue = String(args.minutesInput.value).trim();
    syncSummaryText(args.summaryValue, initialMinutesValue);
    let isEditorOpen = MINUTES_EDITOR_OPEN_BY_DEFAULT;
    syncEditorVisibility({
        editButton: args.editButton,
        isOpen: isEditorOpen,
        minutesForm: args.minutesForm,
        summaryRow: args.summaryRow,
    });

    args.editButton.onclick = () => {
        isEditorOpen = nextMinutesEditorOpenState("edit");
        syncEditorVisibility({
            editButton: args.editButton,
            isOpen: isEditorOpen,
            minutesForm: args.minutesForm,
            summaryRow: args.summaryRow,
        });
        args.minutesInput.focus();
        args.minutesInput.select();
    };
    args.cancelBtn.onclick = () => {
        args.minutesInput.value = initialMinutesValue;
        isEditorOpen = nextMinutesEditorOpenState("cancel");
        syncEditorVisibility({
            editButton: args.editButton,
            isOpen: isEditorOpen,
            minutesForm: args.minutesForm,
            summaryRow: args.summaryRow,
        });
        args.editButton.focus();
    };
    args.minutesForm.onsubmit = (event) => {
        const UPDATED_VALUES = submitMinutesUpdate({
            event,
            initialMinutesValue,
            interactionHandlers: args.interactionHandlers,
            minutesInput: args.minutesInput,
            row: args.row,
        });
        initialMinutesValue = UPDATED_VALUES.initialMinutesValue;
        if (!UPDATED_VALUES.applied) {
            return;
        }
        syncSummaryText(args.summaryValue, initialMinutesValue);
        isEditorOpen = nextMinutesEditorOpenState("saved");
        syncEditorVisibility({
            editButton: args.editButton,
            isOpen: isEditorOpen,
            minutesForm: args.minutesForm,
            summaryRow: args.summaryRow,
        });
        args.editButton.focus();
        args.onMinutesApplied();
    };
}

/**
 * Builds the "planned minutes" editor for a day detail session row.
 * @param row - Calendar row currently being edited.
 * @param interactionHandlers - Handlers used to persist and react to edits.
 * @param onMinutesApplied - Callback invoked after a successful save.
 * @returns Container element with summary display and editable minutes form.
 */
export function minutesFormForSession(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    onMinutesApplied: () => void,
): HTMLElement {
    const MINUTES_CONTAINER = document.createElement("section");
    MINUTES_CONTAINER.className = "day-minutes-editor";
    const SUMMARY_PARTS = createMinutesSummaryRow();

    const MINUTES_FORM = document.createElement("form");
    MINUTES_FORM.className = "day-progress-form day-minutes-form";
    const MINUTES_INPUT = minutesInputForRow(row);
    const MINUTES_LABEL = document.createElement("label");
    MINUTES_LABEL.className = "day-progress-field";
    MINUTES_LABEL.textContent = "Planned Minutes";
    MINUTES_LABEL.append(MINUTES_INPUT);
    const { actions, cancelBtn } = minutesFormActions();
    MINUTES_FORM.append(MINUTES_LABEL, actions);
    bindMinutesEditorActions({
        cancelBtn,
        editButton: SUMMARY_PARTS.editButton,
        interactionHandlers,
        minutesForm: MINUTES_FORM,
        minutesInput: MINUTES_INPUT,
        onMinutesApplied,
        row,
        summaryRow: SUMMARY_PARTS.node,
        summaryValue: SUMMARY_PARTS.summaryValue,
    });
    MINUTES_CONTAINER.append(SUMMARY_PARTS.node, MINUTES_FORM);
    return MINUTES_CONTAINER;
}
