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

interface MinutesEditorState {
    initialMinutesValue: string;
    isEditorOpen: boolean;
}

type MinutesEditorVisibilityArgs = Pick<
    MinutesEditorBindingsArgs,
    "editButton" | "minutesForm" | "summaryRow"
>;

interface BindMinutesFormArgs {
    formParts: MinutesFormParts;
    interactionHandlers: DetailInteractionHandlers;
    onMinutesApplied: () => void;
    row: CalendarRowWithFinish;
    summaryParts: MinutesSummaryRow;
}

function minutesEditorState(
    minutesInput: HTMLInputElement,
): MinutesEditorState {
    return {
        initialMinutesValue: String(minutesInput.value).trim(),
        isEditorOpen: MINUTES_EDITOR_OPEN_BY_DEFAULT,
    };
}

function syncMinutesEditorState(
    args: MinutesEditorVisibilityArgs,
    state: MinutesEditorState,
): void {
    syncEditorVisibility({
        editButton: args.editButton,
        isOpen: state.isEditorOpen,
        minutesForm: args.minutesForm,
        summaryRow: args.summaryRow,
    });
}

function focusMinutesInput(minutesInput: HTMLInputElement): void {
    minutesInput.focus();
    minutesInput.select();
}

function createEditMinutesHandler(
    args: MinutesEditorBindingsArgs,
    state: MinutesEditorState,
): () => void {
    const { editButton, minutesForm, minutesInput, summaryRow } = args;
    return (): void => {
        const STATE = state;
        STATE.isEditorOpen = nextMinutesEditorOpenState("edit");
        syncMinutesEditorState({ editButton, minutesForm, summaryRow }, STATE);
        focusMinutesInput(minutesInput);
    };
}

function createCancelMinutesHandler(
    args: MinutesEditorBindingsArgs,
    state: MinutesEditorState,
): () => void {
    const { editButton, minutesForm, minutesInput, summaryRow } = args;
    return (): void => {
        const STATE = state;
        minutesInput.value = STATE.initialMinutesValue;
        STATE.isEditorOpen = nextMinutesEditorOpenState("cancel");
        syncMinutesEditorState({ editButton, minutesForm, summaryRow }, STATE);
        editButton.focus();
    };
}

function createSubmitMinutesHandler(
    args: MinutesEditorBindingsArgs,
    state: MinutesEditorState,
): (event: SubmitEvent) => void {
    const { editButton, minutesForm, summaryRow } = args;
    return (event: SubmitEvent): void => {
        const STATE = state;
        const UPDATED_VALUES = submittedMinutesValues(args, STATE, event);
        STATE.initialMinutesValue = UPDATED_VALUES.initialMinutesValue;
        if (!UPDATED_VALUES.applied) {
            return;
        }
        applySubmittedMinutes(args, STATE);
        syncMinutesEditorState({ editButton, minutesForm, summaryRow }, STATE);
    };
}

function submittedMinutesValues(
    args: MinutesEditorBindingsArgs,
    state: MinutesEditorState,
    event: SubmitEvent,
) {
    return submitMinutesUpdate({
        event,
        initialMinutesValue: state.initialMinutesValue,
        interactionHandlers: args.interactionHandlers,
        minutesInput: args.minutesInput,
        row: args.row,
    });
}

function applySubmittedMinutes(
    args: Pick<
        MinutesEditorBindingsArgs,
        "editButton" | "onMinutesApplied" | "summaryValue"
    >,
    state: MinutesEditorState,
): void {
    const STATE = state;
    syncSummaryText(args.summaryValue, STATE.initialMinutesValue);
    STATE.isEditorOpen = nextMinutesEditorOpenState("saved");
    args.editButton.focus();
    args.onMinutesApplied();
}

function bindMinutesEditorActions(args: MinutesEditorBindingsArgs): void {
    const { cancelBtn, editButton, minutesForm, minutesInput, summaryValue } =
        args;
    const STATE = minutesEditorState(minutesInput);
    syncSummaryText(summaryValue, STATE.initialMinutesValue);
    syncMinutesEditorState(args, STATE);
    editButton.onclick = createEditMinutesHandler(args, STATE);
    cancelBtn.onclick = createCancelMinutesHandler(args, STATE);
    minutesForm.onsubmit = createSubmitMinutesHandler(args, STATE);
}

interface MinutesFormParts {
    cancelBtn: HTMLButtonElement;
    minutesForm: HTMLFormElement;
    minutesInput: HTMLInputElement;
}

function createMinutesFormParts(row: CalendarRowWithFinish): MinutesFormParts {
    const MINUTES_FORM = document.createElement("form");
    MINUTES_FORM.className = "day-progress-form day-minutes-form";
    const MINUTES_INPUT = minutesInputForRow(row);
    const MINUTES_LABEL = document.createElement("label");
    MINUTES_LABEL.className = "day-progress-field";
    MINUTES_LABEL.textContent = "Planned Minutes";
    MINUTES_LABEL.append(MINUTES_INPUT);
    const { actions, cancelBtn } = minutesFormActions();
    MINUTES_FORM.append(MINUTES_LABEL, actions);
    return {
        cancelBtn,
        minutesForm: MINUTES_FORM,
        minutesInput: MINUTES_INPUT,
    };
}

function bindMinutesForm(args: BindMinutesFormArgs): void {
    bindMinutesEditorActions({
        cancelBtn: args.formParts.cancelBtn,
        editButton: args.summaryParts.editButton,
        interactionHandlers: args.interactionHandlers,
        minutesForm: args.formParts.minutesForm,
        minutesInput: args.formParts.minutesInput,
        onMinutesApplied: args.onMinutesApplied,
        row: args.row,
        summaryRow: args.summaryParts.node,
        summaryValue: args.summaryParts.summaryValue,
    });
}

function createMinutesContainer(): HTMLElement {
    const MINUTES_CONTAINER = document.createElement("section");
    MINUTES_CONTAINER.className = "day-minutes-editor";
    return MINUTES_CONTAINER;
}

export function minutesFormForSession(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    onMinutesApplied: () => void,
): HTMLElement {
    const MINUTES_CONTAINER = createMinutesContainer();
    const SUMMARY_PARTS = createMinutesSummaryRow();
    const FORM_PARTS = createMinutesFormParts(row);
    bindMinutesForm({
        formParts: FORM_PARTS,
        interactionHandlers,
        onMinutesApplied,
        row,
        summaryParts: SUMMARY_PARTS,
    });
    MINUTES_CONTAINER.append(SUMMARY_PARTS.node, FORM_PARTS.minutesForm);
    return MINUTES_CONTAINER;
}
