/** Builds the book form controls whose choices come from the library model. */
import { el } from "../dom.ts";
import {
    createApplyScheduledDaysToShelfLabel,
    createScheduledDaysField,
} from "./form_layout_schedule.ts";
import { SHELF_SELECT_CREATE_NEW } from "./shelf.ts";
import { statusOptions } from "./status_catalog.ts";

const SHELF_HELP_ID = "bookShelfCollectionsHelp";

/**
 * Creates shelf select field with built-in create-shelf option.
 * @returns Labeled shelf select node for form grid insertion.
 */
function createShelfSelectLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.textContent = "Bookshelf";

    const SELECT = document.createElement("select");
    SELECT.id = "bookShelfSelectInput";
    SELECT.setAttribute("aria-describedby", SHELF_HELP_ID);
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
    INPUT.autocomplete = "off";
    INPUT.setAttribute("role", "combobox");
    INPUT.setAttribute("aria-autocomplete", "list");
    INPUT.setAttribute("aria-expanded", "false");
    INPUT.setAttribute("aria-controls", "bookCollectionResults");
    INPUT.setAttribute("aria-haspopup", "listbox");
    INPUT.setAttribute("aria-describedby", SHELF_HELP_ID);
    return INPUT;
}

/**
 * Creates the field box that holds the chips and the search input, styled
 * as one input.
 * @returns Combobox field box.
 */
function createCollectionBox(): HTMLDivElement {
    const BOX = document.createElement("div");
    BOX.className = "combobox-field control-focus-ring";
    const CHIPS = document.createElement("div");
    CHIPS.id = "bookCollectionChips";
    CHIPS.className = "book-collection-chips";
    CHIPS.setAttribute("role", "group");
    CHIPS.setAttribute("aria-label", "Selected collections");
    BOX.append(CHIPS, createCollectionInput());
    return BOX;
}

/**
 * Creates the collections field: chips inside a searchable field, with the
 * menu promoted to the top layer when open.
 * @returns Container holding the label, field, and menu.
 */
function createCollectionsField(): HTMLDivElement {
    const FIELD = document.createElement("div");
    FIELD.id = "bookCollectionsField";
    FIELD.className = "book-collections book-collection-picker";
    const LABEL = document.createElement("label");
    LABEL.className = "book-field-label";
    LABEL.htmlFor = "bookCollectionInput";
    LABEL.textContent = "Collections";
    const RESULTS = document.createElement("div");
    RESULTS.id = "bookCollectionResults";
    RESULTS.className = "book-search-results";
    RESULTS.setAttribute("role", "listbox");
    RESULTS.setAttribute("aria-multiselectable", "true");
    RESULTS.setAttribute("aria-label", "Collection options");
    FIELD.append(LABEL, createCollectionBox(), RESULTS);
    return FIELD;
}

/**
 * Creates the note explaining shelves versus collections.
 * @returns Helper paragraph.
 */
function createShelfCollectionsHelp(): HTMLParagraphElement {
    const HELP = document.createElement("p");
    HELP.id = SHELF_HELP_ID;
    HELP.className = "book-field-help";
    HELP.textContent =
        "A book lives on one shelf but can be in any number of collections.";
    return HELP;
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
        createShelfCollectionsHelp(),
    );
    el("bookSchedulingFields").append(
        createScheduledDaysField(),
        createApplyScheduledDaysToShelfLabel(),
    );
}
