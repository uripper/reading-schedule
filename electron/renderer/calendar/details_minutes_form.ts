import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import {
  minutesFormActions,
  minutesInputForRow,
} from "./details_minutes_form_dom.js";
import {
  MINUTES_EDITOR_OPEN_BY_DEFAULT,
  nextMinutesEditorOpenState,
  plannedMinutesSummaryText,
  submitMinutesUpdate,
  syncEditorVisibility,
  syncSummaryText,
} from "./details_minutes_form_helpers.js";

const EDIT_MINUTES_BUTTON_LABEL = "Edit planned minutes";
const EDIT_MINUTES_BUTTON_ICON = "✎";

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
  const minutesInput = minutesInputForRow(row);
  const minutesLabel = document.createElement("label");
  minutesLabel.className = "day-progress-field";
  minutesLabel.textContent = "Planned Minutes";
  minutesLabel.append(minutesInput);
  const { actions, cancelBtn } = minutesFormActions();
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

export {
  MINUTES_EDITOR_OPEN_BY_DEFAULT,
  nextMinutesEditorOpenState,
  plannedMinutesSummaryText,
};
