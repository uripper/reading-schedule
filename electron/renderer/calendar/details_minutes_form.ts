import {
    type CalendarRowWithFinish,
    type DetailInteractionHandlers,
} from "../../types/types.js";
import {
    minutesFormActions,
    minutesInputForRow,
} from "./details_minutes_form_dom.js";
import {
    MINUTES_EDITOR_OPEN_BY_DEFAULT,
    nextMinutesEditorOpenState,
    submitMinutesUpdate,
    syncEditorVisibility,
    syncSummaryText,
} from "./details_minutes_form_helpers.js";

const EDIT_MINUTES_BUTTON_LABEL = "Edit planned minutes";
const EDIT_MINUTES_BUTTON_TEXT = "Edit";

/**
 * Builds the "planned minutes" editor for a day detail session row.
 * @param row Calendar row currently being edited.
 * @param interactionHandlers Handlers used to persist and react to edits.
 * @param onMinutesApplied Callback invoked after a successful save.
 * @returns Container element with summary display and editable minutes form.
 */
export function minutesFormForSession(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    onMinutesApplied: () => void,
): HTMLElement {
    const MINUTES_CONTAINER = document.createElement("section");
    MINUTES_CONTAINER.className = "day-minutes-editor";
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

    const MINUTES_FORM = document.createElement("form");
    MINUTES_FORM.className = "day-progress-form day-minutes-form";
    const MINUTES_INPUT = minutesInputForRow(row);
    const MINUTES_LABEL = document.createElement("label");
    MINUTES_LABEL.className = "day-progress-field";
    MINUTES_LABEL.textContent = "Planned Minutes";
    MINUTES_LABEL.append(MINUTES_INPUT);
    const { actions, cancelBtn } = minutesFormActions();
    let initialMinutesValue = String(MINUTES_INPUT.value).trim();
    syncSummaryText(SUMMARY_VALUE, initialMinutesValue);
    let isEditorOpen = MINUTES_EDITOR_OPEN_BY_DEFAULT;
    syncEditorVisibility(MINUTES_FORM, SUMMARY_ROW, EDIT_BUTTON, isEditorOpen);
    MINUTES_FORM.append(MINUTES_LABEL, actions);

    EDIT_BUTTON.onclick = () => {
        isEditorOpen = nextMinutesEditorOpenState("edit");
        syncEditorVisibility(
            MINUTES_FORM,
            SUMMARY_ROW,
            EDIT_BUTTON,
            isEditorOpen,
        );
        MINUTES_INPUT.focus();
        MINUTES_INPUT.select();
    };
    cancelBtn.onclick = () => {
        MINUTES_INPUT.value = initialMinutesValue;
        isEditorOpen = nextMinutesEditorOpenState("cancel");
        syncEditorVisibility(
            MINUTES_FORM,
            SUMMARY_ROW,
            EDIT_BUTTON,
            isEditorOpen,
        );
        EDIT_BUTTON.focus();
    };
    MINUTES_FORM.onsubmit = (event) => {
        const UPDATED_VALUES = submitMinutesUpdate({
            event,
            initialMinutesValue,
            interactionHandlers,
            minutesInput: MINUTES_INPUT,
            row,
        });
        initialMinutesValue = UPDATED_VALUES.initialMinutesValue;
        if (UPDATED_VALUES.applied) {
            syncSummaryText(SUMMARY_VALUE, initialMinutesValue);
            isEditorOpen = nextMinutesEditorOpenState("saved");
            syncEditorVisibility(
                MINUTES_FORM,
                SUMMARY_ROW,
                EDIT_BUTTON,
                isEditorOpen,
            );
            EDIT_BUTTON.focus();
            onMinutesApplied();
        }
    };
    MINUTES_CONTAINER.append(SUMMARY_ROW, MINUTES_FORM);
    return MINUTES_CONTAINER;
}
