import { BOOK_WEEKDAYS } from "./scheduled_days.js";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";
import { statusOptions } from "./status_catalog.js";

/**
 * Creates shelf select field with built-in create-shelf option.
 * @returns Labeled shelf select node for form grid insertion.
 */
function createShelfSelectLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.textContent = "Bookshelf";

    const SELECT = document.createElement("select");
    SELECT.id = "bookShelfSelectInput";
    const UNSHELVED_OPTION = document.createElement("option");
    UNSHELVED_OPTION.value = "";
    UNSHELVED_OPTION.textContent = "Unshelved";
    const CREATE_NEW_OPTION = document.createElement("option");
    CREATE_NEW_OPTION.value = SHELF_SELECT_CREATE_NEW;
    CREATE_NEW_OPTION.textContent = "Create new shelf...";
    SELECT.append(UNSHELVED_OPTION, CREATE_NEW_OPTION);
    LABEL.append(SELECT);
    return LABEL;
}

/**
 * Creates status select field populated from supported status options.
 * @returns Labeled status select node for form grid insertion.
 */
function createStatusSelectLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.textContent = "Status";

    const SELECT = document.createElement("select");
    SELECT.id = "bookStatusSelectInput";

    for (const OPTION_DEF of statusOptions()) {
        const OPTION = document.createElement("option");
        OPTION.value = OPTION_DEF.value;
        OPTION.textContent = OPTION_DEF.label;
        SELECT.append(OPTION);
    }

    LABEL.append(SELECT);
    return LABEL;
}

/**
 * Creates finished-date field shown only for read status.
 * @returns Labeled date input node for form grid insertion.
 */
function createFinishedAtLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.id = "bookFinishedAtField";
    LABEL.hidden = true;
    LABEL.textContent = "Finish Date";

    const INPUT = document.createElement("input");
    INPUT.id = "bookFinishedAtInput";
    INPUT.type = "date";

    LABEL.append(INPUT);
    return LABEL;
}

/**
 * Creates the scheduled-days fieldset with weekday checkbox controls.
 * @returns Fieldset node for selecting per-book scheduled weekdays.
 */
function createScheduledDaysField(): HTMLFieldSetElement {
    const FIELDSET = document.createElement("fieldset");
    FIELDSET.id = "bookScheduledDaysField";
    FIELDSET.className = "book-scheduled-days";

    const LEGEND = document.createElement("legend");
    LEGEND.textContent = "Scheduled Days";
    FIELDSET.append(LEGEND);

    const DAYS = document.createElement("div");
    DAYS.className = "book-scheduled-days-grid";

    for (const WEEKDAY of BOOK_WEEKDAYS) {
        const LABEL = document.createElement("label");
        LABEL.className = "book-scheduled-day";

        const INPUT = document.createElement("input");
        INPUT.type = "checkbox";
        INPUT.value = WEEKDAY;
        INPUT.checked = true;
        INPUT.dataset.bookWeekday = "1";

        LABEL.append(INPUT, document.createTextNode(WEEKDAY));
        DAYS.append(LABEL);
    }

    FIELDSET.append(DAYS);

    return FIELDSET;
}

/**
 * Creates a toggle used to apply weekday changes across same-shelf books.
 * @returns Labeled checkbox node for shelf-wide weekday propagation.
 */
function createApplyScheduledDaysToShelfLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.className = "toggle-row book-apply-days-toggle";

    const INPUT = document.createElement("input");
    INPUT.id = "bookApplyScheduledDaysToShelfInput";
    INPUT.type = "checkbox";

    const TEXT = document.createElement("span");
    TEXT.textContent = "Apply scheduled days to all books on this shelf";

    LABEL.append(INPUT, TEXT);
    return LABEL;
}

/**
 * Ensures dynamic book form fields are present in the settings grid.
 */
export function ensureBookFormLayoutFields(): void {
    const EXISTING = document.getElementById("bookShelfSelectInput");
    if (EXISTING) {
        return;
    }

    const GRID = document.querySelector(
        "#bookForm .book-fields .settings-grid",
    );
    if (!(GRID instanceof HTMLElement)) {
        return;
    }

    GRID.append(
        createStatusSelectLabel(),
        createFinishedAtLabel(),
        createShelfSelectLabel(),
        createScheduledDaysField(),
        createApplyScheduledDaysToShelfLabel(),
    );
}
