/** Builds the book form controls whose choices come from the library model. */
import { el } from "../dom.ts";
import { BOOK_WEEKDAYS } from "./scheduled_days.ts";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.ts";
import { statusOptions } from "./status_catalog.ts";

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
 * Creates the collection combobox input.
 * @returns Input that searches existing collections or names a new one.
 */
function createCollectionInput(): HTMLInputElement {
    const INPUT = document.createElement("input");
    INPUT.id = "bookCollectionInput";
    INPUT.type = "text";
    INPUT.placeholder = "Search or create a collection";
    INPUT.autocomplete = "off";
    INPUT.setAttribute("role", "combobox");
    INPUT.setAttribute("aria-autocomplete", "list");
    INPUT.setAttribute("aria-expanded", "false");
    INPUT.setAttribute("aria-controls", "bookCollectionResults");
    INPUT.setAttribute("aria-haspopup", "listbox");
    return INPUT;
}

/**
 * Creates the collections field: a searchable dropdown with the book's
 * collections listed underneath as removable chips.
 * @returns Container holding the combobox, its options, and the chips.
 */
function createCollectionsField(): HTMLDivElement {
    const FIELD = document.createElement("div");
    FIELD.id = "bookCollectionsField";
    FIELD.className = "book-collections";

    const LABEL = document.createElement("label");
    LABEL.className = "book-collection-picker";
    LABEL.textContent = "Collections";
    const RESULTS = document.createElement("div");
    RESULTS.id = "bookCollectionResults";
    RESULTS.className = "book-search-results";
    RESULTS.setAttribute("role", "listbox");
    RESULTS.setAttribute("aria-label", "Collection options");
    LABEL.append(createCollectionInput(), RESULTS);

    const CHIPS = document.createElement("div");
    CHIPS.id = "bookCollectionChips";
    CHIPS.className = "book-collection-chips";
    CHIPS.setAttribute("role", "group");
    CHIPS.setAttribute("aria-label", "Selected collections");

    FIELD.append(LABEL, CHIPS);
    return FIELD;
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
    INPUT.type = "text";

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
        LABEL.className = "btn btn-compact book-scheduled-day";

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
 * Places the dynamic fields in their corresponding dialog sections.
 */
export function ensureBookFormLayoutFields(): void {
    const EXISTING = document.getElementById("bookShelfSelectInput");
    if (EXISTING) {
        return;
    }

    el("bookDetailsFields").append(
        createStatusSelectLabel(),
        createFinishedAtLabel(),
    );
    el("bookShelfCollectionsFields").append(
        createShelfSelectLabel(),
        createCollectionsField(),
    );
    el("bookSchedulingFields").append(
        createScheduledDaysField(),
        createApplyScheduledDaysToShelfLabel(),
    );
}
