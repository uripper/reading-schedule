import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";

const UNSHELVED_VALUE = "";
const UNSHELVED_LABEL = "Unshelved";
const CREATE_SHELF_LABEL = "Create new shelf...";
const DATA_KEY_PREVIOUS_SHELF = "previousShelf";

/**
 * Creates a select option element for the shelf dropdown.
 * @param value Option value attribute.
 * @param label User-facing option text.
 * @returns Configured option element.
 */
function createOption(value: string, label: string): HTMLOptionElement {
	const option = document.createElement("option");
	option.value = value;
	option.textContent = label;
	return option;
}

/**
 * Builds ordered shelf options including default and "create new" entries.
 * @param shelves Existing shelf names.
 * @returns Option elements ready to render into the shelf select.
 */
function shelfOptions(shelves: string[]): HTMLOptionElement[] {
	const options = [createOption(UNSHELVED_VALUE, UNSHELVED_LABEL)];
	shelves.forEach((shelfName) => {
		options.push(createOption(shelfName, shelfName));
	});
	options.push(createOption(SHELF_SELECT_CREATE_NEW, CREATE_SHELF_LABEL));
	return options;
}

/**
 * Replaces shelf select options and sets the selected value.
 * @param select Shelf dropdown element.
 * @param shelves Existing shelf names.
 * @param selectedShelf Shelf value to select when available.
 */
function renderShelfOptions(
	select: HTMLSelectElement,
	shelves: string[],
	selectedShelf: string,
): void {
	const shelfSelect = select;
	shelfSelect.replaceChildren(...shelfOptions(shelves));
	if (selectedShelf) {
		shelfSelect.value = selectedShelf;
		return;
	}
	shelfSelect.value = UNSHELVED_VALUE;
}

/**
 * Compares shelf names in a case-insensitive way.
 * @param left Left shelf name.
 * @param right Right shelf name.
 * @returns True when names are equal ignoring case.
 */
function caseInsensitiveMatch(left: string, right: string): boolean {
	return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

/**
 * Collects concrete shelf values from the current dropdown options.
 * @param select Shelf dropdown element.
 * @returns Shelf names excluding empty and "create new" entries.
 */
function collectShelfValues(select: HTMLSelectElement): string[] {
	const values: string[] = [];
	Array.from(select.options).forEach((option) => {
		if (!option.value || option.value === SHELF_SELECT_CREATE_NEW) {
			return;
		}
		values.push(option.value);
	});
	return values;
}

/**
 * Stores the current shelf selection for later restoration.
 * @param select Shelf dropdown element.
 */
export function rememberSelectedShelf(select: HTMLSelectElement): void {
	const shelfSelect = select;
	shelfSelect.dataset[DATA_KEY_PREVIOUS_SHELF] = shelfSelect.value;
}

/**
 * Reads the previously remembered shelf value for the dropdown.
 * @param select Shelf dropdown element.
 * @returns Previously selected shelf, or unshelved when missing.
 */
export function previousShelf(select: HTMLSelectElement): string {
	return String(select.dataset[DATA_KEY_PREVIOUS_SHELF] ?? UNSHELVED_VALUE);
}

/**
 * Finds an existing option value matching a shelf name case-insensitively.
 * @param select Shelf dropdown element.
 * @param shelfName Candidate shelf name.
 * @returns Matched option value, or empty string when not found.
 */
export function existingShelfValue(
	select: HTMLSelectElement,
	shelfName: string,
): string {
	for (const option of Array.from(select.options)) {
		if (!option.value || option.value === SHELF_SELECT_CREATE_NEW) {
			continue;
		}
		if (caseInsensitiveMatch(option.value, shelfName)) {
			return option.value;
		}
	}
	return "";
}

/**
 * Adds a missing shelf option and keeps options sorted alphabetically.
 * @param select Shelf dropdown element.
 * @param shelfName Shelf name to ensure exists in options.
 */
export function ensureShelfOption(
	select: HTMLSelectElement,
	shelfName: string,
): void {
	const shelves = collectShelfValues(select);
	if (shelves.includes(shelfName)) {
		return;
	}
	shelves.push(shelfName);
	shelves.sort((left, right) => {
		return left.localeCompare(right, undefined, { sensitivity: "base" });
	});
	renderShelfOptions(select, shelves, shelfName);
}

/**
 * Sets shelf select options and resolves/creates the selected shelf value.
 * @param select Shelf dropdown element.
 * @param selectedShelf Current shelf value from form or persisted state.
 * @param availableShelves Known shelf names from the catalog.
 */
export function setSelectedShelf(
	select: HTMLSelectElement,
	selectedShelf: string,
	availableShelves: string[],
): void {
	const shelfSelect = select;
	const shelf = String(selectedShelf || "").trim();
	renderShelfOptions(shelfSelect, availableShelves, "");
	if (!shelf) {
		rememberSelectedShelf(shelfSelect);
		return;
	}
	const existingValue = existingShelfValue(shelfSelect, shelf);
	if (existingValue) {
		shelfSelect.value = existingValue;
		rememberSelectedShelf(shelfSelect);
		return;
	}
	ensureShelfOption(shelfSelect, shelf);
	shelfSelect.value = shelf;
	rememberSelectedShelf(shelfSelect);
}
