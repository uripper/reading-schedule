import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import { BOOK_WEEKDAYS } from "./scheduled_days.js";
import { statusOptions } from "./status.js";

/**
 * Creates shelf select field with built-in create-shelf option.
 * @returns Labeled shelf select node for form grid insertion.
 */
function createShelfSelectLabel(): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = "Bookshelf";

  const select = document.createElement("select");
  select.id = "bookShelfSelectInput";
  const unshelvedOption = document.createElement("option");
  unshelvedOption.value = "";
  unshelvedOption.textContent = "Unshelved";
  const createNewOption = document.createElement("option");
  createNewOption.value = SHELF_SELECT_CREATE_NEW;
  createNewOption.textContent = "Create new shelf...";
  select.append(unshelvedOption, createNewOption);
  label.append(select);
  return label;
}

/**
 * Creates status select field populated from supported status options.
 * @returns Labeled status select node for form grid insertion.
 */
function createStatusSelectLabel(): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = "Status";

  const select = document.createElement("select");
  select.id = "bookStatusSelectInput";
  statusOptions().forEach((optionDef) => {
    const option = document.createElement("option");
    option.value = optionDef.value;
    option.textContent = optionDef.label;
    select.append(option);
  });

  label.append(select);
  return label;
}

/**
 * Creates finished-date field shown only for read status.
 * @returns Labeled date input node for form grid insertion.
 */
function createFinishedAtLabel(): HTMLLabelElement {
  const label = document.createElement("label");
  label.id = "bookFinishedAtField";
  label.hidden = true;
  label.textContent = "Finish Date";

  const input = document.createElement("input");
  input.id = "bookFinishedAtInput";
  input.type = "date";

  label.append(input);
  return label;
}

/**
 * Creates the scheduled-days fieldset with weekday checkbox controls.
 * @returns Fieldset node for selecting per-book scheduled weekdays.
 */
function createScheduledDaysField(): HTMLFieldSetElement {
  const fieldset = document.createElement("fieldset");
  fieldset.id = "bookScheduledDaysField";
  fieldset.className = "book-scheduled-days";

  const legend = document.createElement("legend");
  legend.textContent = "Scheduled Days";
  fieldset.append(legend);

  const days = document.createElement("div");
  days.className = "book-scheduled-days-grid";
  BOOK_WEEKDAYS.forEach((weekday) => {
    const label = document.createElement("label");
    label.className = "book-scheduled-day";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = weekday;
    input.checked = true;
    input.setAttribute("data-book-weekday", "1");

    label.append(input, document.createTextNode(weekday));
    days.append(label);
  });
  fieldset.append(days);

  return fieldset;
}

/**
 * Creates a toggle used to apply weekday changes across same-shelf books.
 * @returns Labeled checkbox node for shelf-wide weekday propagation.
 */
function createApplyScheduledDaysToShelfLabel(): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "toggle-row book-apply-days-toggle";

  const input = document.createElement("input");
  input.id = "bookApplyScheduledDaysToShelfInput";
  input.type = "checkbox";

  const text = document.createElement("span");
  text.textContent = "Apply scheduled days to all books on this shelf";

  label.append(input, text);
  return label;
}

/**
 * Ensures dynamic book form fields are present in the settings grid.
 */
export function ensureBookFormLayoutFields(): void {
  const existing = document.getElementById("bookShelfSelectInput");
  if (existing) {
    return;
  }

  const grid = document.querySelector("#bookForm .book-fields .settings-grid");
  if (!(grid instanceof HTMLElement)) {
    return;
  }

  grid.append(
    createStatusSelectLabel(),
    createFinishedAtLabel(),
    createShelfSelectLabel(),
    createScheduledDaysField(),
    createApplyScheduledDaysToShelfLabel(),
  );
}
