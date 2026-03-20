import { SHELF_SELECT_CREATE_NEW, UNSHELVED_LABEL } from "./shelf.ts";

const UNSHELVED_VALUE = "";
const CREATE_SHELF_LABEL = "Create new shelf...";
const DATA_KEY_PREVIOUS_SHELF = "previousShelf";

/**
 * Creates a select option element for the shelf dropdown.
 * @param value - Option value attribute.
 * @param label - User-facing option text.
 * @returns Configured option element.
 */
function createOption(value: string, label: string): HTMLOptionElement {
    const OPTION = document.createElement("option");
    OPTION.value = value;
    OPTION.textContent = label;
    return OPTION;
}

/**
 * Builds ordered shelf options including default and "create new" entries.
 * @param shelves - Existing shelf names.
 * @returns Option elements ready to render into the shelf select.
 */
function shelfOptions(shelves: string[]): HTMLOptionElement[] {
    const OPTIONS = [createOption(UNSHELVED_VALUE, UNSHELVED_LABEL)];

    for (const SHELF_NAME of shelves) {
        OPTIONS.push(createOption(SHELF_NAME, SHELF_NAME));
    }
    OPTIONS.push(createOption(SHELF_SELECT_CREATE_NEW, CREATE_SHELF_LABEL));
    return OPTIONS;
}

/**
 * Replaces shelf select options and sets the selected value.
 * @param select - Shelf dropdown element.
 * @param shelves - Existing shelf names.
 * @param selectedShelf - Shelf value to select when available.
 */
function renderShelfOptions(
    select: HTMLSelectElement,
    shelves: string[],
    selectedShelf: string,
): void {
    const SHELF_SELECT = select;
    SHELF_SELECT.replaceChildren(...shelfOptions(shelves));
    if (selectedShelf) {
        SHELF_SELECT.value = selectedShelf;
        return;
    }
    SHELF_SELECT.value = UNSHELVED_VALUE;
}

function syncRememberedShelf(select: HTMLSelectElement): void {
    rememberSelectedShelf(select);
}

function selectExistingShelf(
    select: HTMLSelectElement,
    shelfName: string,
): boolean {
    const EXISTING_VALUE = existingShelfValue(select, shelfName);
    if (EXISTING_VALUE === "") {
        return false;
    }
    const SHELF_SELECT = select;
    SHELF_SELECT.value = EXISTING_VALUE;
    syncRememberedShelf(SHELF_SELECT);
    return true;
}

/**
 * Compares shelf names in a case-insensitive way.
 * @param left - Left shelf name.
 * @param right - Right shelf name.
 * @returns True when names are equal ignoring case.
 */
function caseInsensitiveMatch(left: string, right: string): boolean {
    return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

function isConcreteShelfOption(option: HTMLOptionElement): boolean {
    return option.value !== "" && option.value !== SHELF_SELECT_CREATE_NEW;
}

/**
 * Collects concrete shelf values from the current dropdown options.
 * @param select - Shelf dropdown element.
 * @returns Shelf names excluding empty and "create new" entries.
 */
function collectShelfValues(select: HTMLSelectElement): string[] {
    const VALUES: string[] = [];

    for (const OPTION of Array.from(select.options)) {
        if (!isConcreteShelfOption(OPTION)) {
            continue;
        }
        VALUES.push(OPTION.value);
    }
    return VALUES;
}

/**
 * Stores the current shelf selection for later restoration.
 * @param select - Shelf dropdown element.
 */
export function rememberSelectedShelf(select: HTMLSelectElement): void {
    const SHELF_SELECT = select;
    SHELF_SELECT.dataset[DATA_KEY_PREVIOUS_SHELF] = SHELF_SELECT.value;
}

/**
 * Reads the previously remembered shelf value for the dropdown.
 * @param select - Shelf dropdown element.
 * @returns Previously selected shelf, or unshelved when missing.
 */
export function previousShelf(select: HTMLSelectElement): string {
    return String(select.dataset[DATA_KEY_PREVIOUS_SHELF] ?? UNSHELVED_VALUE);
}

/**
 * Finds an existing option value matching a shelf name case-insensitively.
 * @param select - Shelf dropdown element.
 * @param shelfName - Candidate shelf name.
 * @returns Matched option value, or empty string when not found.
 */
export function existingShelfValue(
    select: HTMLSelectElement,
    shelfName: string,
): string {
    for (const OPTION of Array.from(select.options)) {
        if (!isConcreteShelfOption(OPTION)) {
            continue;
        }
        if (caseInsensitiveMatch(OPTION.value, shelfName)) {
            return OPTION.value;
        }
    }
    return "";
}

/**
 * Adds a missing shelf option and keeps options sorted alphabetically.
 * @param select - Shelf dropdown element.
 * @param shelfName - Shelf name to ensure exists in options.
 */
export function ensureShelfOption(
    select: HTMLSelectElement,
    shelfName: string,
): void {
    const SHELVES = collectShelfValues(select);
    if (SHELVES.includes(shelfName)) {
        return;
    }
    SHELVES.push(shelfName);
    SHELVES.sort((left, right) => {
        return left.localeCompare(right, undefined, { sensitivity: "base" });
    });
    renderShelfOptions(select, SHELVES, shelfName);
}

/**
 * Sets shelf select options and resolves/creates the selected shelf value.
 * @param select - Shelf dropdown element.
 * @param selectedShelf - Current shelf value from form or persisted state.
 * @param availableShelves - Known shelf names from the catalog.
 */
export function setSelectedShelf(
    select: HTMLSelectElement,
    selectedShelf: string,
    availableShelves: string[],
): void {
    const SHELF_SELECT = select;
    const SHELF = String(selectedShelf || "").trim();
    renderShelfOptions(SHELF_SELECT, availableShelves, "");
    if (!SHELF) {
        syncRememberedShelf(SHELF_SELECT);
        return;
    }
    if (selectExistingShelf(SHELF_SELECT, SHELF)) {
        return;
    }
    ensureShelfOption(SHELF_SELECT, SHELF);
    SHELF_SELECT.value = SHELF;
    syncRememberedShelf(SHELF_SELECT);
}
