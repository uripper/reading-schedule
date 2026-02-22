import { SHELF_SELECT_CREATE_NEW } from "./shelf.js";

const UNSHELVED_VALUE = "";
const UNSHELVED_LABEL = "Unshelved";
const CREATE_SHELF_LABEL = "Create new shelf...";
const DATA_KEY_PREVIOUS_SHELF = "previousShelf";

/**
 *
 * @param value
 * @param label
 */
function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

/**
 *
 * @param shelves
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
 *
 * @param select
 * @param shelves
 * @param selectedShelf
 */
function renderShelfOptions(
  select: HTMLSelectElement,
  shelves: string[],
  selectedShelf: string,
): void {
  select.replaceChildren(...shelfOptions(shelves));
  if (selectedShelf) {
    select.value = selectedShelf;
    return;
  }
  select.value = UNSHELVED_VALUE;
}

/**
 *
 * @param left
 * @param right
 */
function caseInsensitiveMatch(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

/**
 *
 * @param select
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
 *
 * @param select
 */
export function rememberSelectedShelf(select: HTMLSelectElement): void {
  select.dataset[DATA_KEY_PREVIOUS_SHELF] = select.value;
}

/**
 *
 * @param select
 */
export function previousShelf(select: HTMLSelectElement): string {
  return String(select.dataset[DATA_KEY_PREVIOUS_SHELF] || UNSHELVED_VALUE);
}

/**
 *
 * @param select
 * @param shelfName
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
 *
 * @param select
 * @param shelfName
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
 *
 * @param select
 * @param selectedShelf
 * @param availableShelves
 */
export function setSelectedShelf(
  select: HTMLSelectElement,
  selectedShelf: string,
  availableShelves: string[],
): void {
  const shelf = String(selectedShelf || "").trim();
  renderShelfOptions(select, availableShelves, "");
  if (!shelf) {
    rememberSelectedShelf(select);
    return;
  }
  const existingValue = existingShelfValue(select, shelf);
  if (existingValue) {
    select.value = existingValue;
    rememberSelectedShelf(select);
    return;
  }
  ensureShelfOption(select, shelf);
  select.value = shelf;
  rememberSelectedShelf(select);
}
