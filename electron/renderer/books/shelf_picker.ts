// @ts-nocheck
import { SHELF_SELECT_CREATE_NEW, uniqueShelves } from "./shelf.js";

const UNSHELVED_VALUE = "";
const UNSHELVED_LABEL = "Unshelved";
const CREATE_SHELF_LABEL = "Create new shelf...";
const CREATE_SHELF_PROMPT = "Enter a name for the new shelf:";
const DATA_KEY_PREVIOUS_SHELF = "previousShelf";

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function shelfOptions(shelves = []) {
  const options = [createOption(UNSHELVED_VALUE, UNSHELVED_LABEL)];
  shelves.forEach((shelfName) => {
    options.push(createOption(shelfName, shelfName));
  });
  options.push(createOption(SHELF_SELECT_CREATE_NEW, CREATE_SHELF_LABEL));
  return options;
}

function rememberSelectedShelf(select) {
  select.dataset[DATA_KEY_PREVIOUS_SHELF] = select.value;
}

function previousShelf(select) {
  return String(select.dataset[DATA_KEY_PREVIOUS_SHELF] || UNSHELVED_VALUE);
}

function caseInsensitiveMatch(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

function existingShelfValue(select, shelfName) {
  const options = Array.from(select.options);
  for (const option of options) {
    if (!option.value || option.value === SHELF_SELECT_CREATE_NEW) {
      continue;
    }
    if (caseInsensitiveMatch(option.value, shelfName)) {
      return option.value;
    }
  }
  return "";
}

function collectShelfValues(select) {
  const values = [];
  const options = Array.from(select.options);
  options.forEach((option) => {
    if (!option.value || option.value === SHELF_SELECT_CREATE_NEW) {
      return;
    }
    values.push(option.value);
  });
  return values;
}

function renderShelfOptions(select, shelves, selectedShelf) {
  const nodes = shelfOptions(shelves);
  select.replaceChildren(...nodes);
  if (selectedShelf) {
    select.value = selectedShelf;
    return;
  }
  select.value = UNSHELVED_VALUE;
}

function ensureShelfOption(select, shelfName) {
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

function setSelectedShelf(select, selectedShelf, availableShelves) {
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

function onCreateShelfSelected(select) {
  const fallbackShelf = previousShelf(select);
  const input = globalThis.prompt(CREATE_SHELF_PROMPT, "");
  if (input === null) {
    select.value = fallbackShelf;
    return;
  }
  const shelfName = String(input).trim();
  if (!shelfName) {
    select.value = fallbackShelf;
    return;
  }
  const existingValue = existingShelfValue(select, shelfName);
  if (existingValue) {
    select.value = existingValue;
    rememberSelectedShelf(select);
    return;
  }
  ensureShelfOption(select, shelfName);
  select.value = shelfName;
  rememberSelectedShelf(select);
}

function onShelfChange(select) {
  if (select.value === SHELF_SELECT_CREATE_NEW) {
    onCreateShelfSelected(select);
    return;
  }
  rememberSelectedShelf(select);
}

export function renderShelfPicker(refs, books = [], selectedShelf = "") {
  const shelves = uniqueShelves(books);
  setSelectedShelf(refs.shelfSelectInput, selectedShelf, shelves);
}

export function bindShelfPicker(refs) {
  refs.shelfSelectInput.addEventListener("change", () => {
    onShelfChange(refs.shelfSelectInput);
  });
}
