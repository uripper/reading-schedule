import { SHELF_SELECT_CREATE_NEW, uniqueShelves } from "./shelf.js";
import type { Book } from "./types.js";
import type { BookFormRefs } from "./form_refs.js";

const UNSHELVED_VALUE = "";
const UNSHELVED_LABEL = "Unshelved";
const CREATE_SHELF_LABEL = "Create new shelf...";
const DATA_KEY_PREVIOUS_SHELF = "previousShelf";
const DIALOG_CONFIRM_VALUE = "confirm";
const CREATE_SHELF_PROMPT = "Enter a name for the new shelf:";

function promptViaDialog(refs: BookFormRefs): Promise<string | null> {
  return new Promise((resolve) => {
    refs.shelfPromptInput.value = "";
    refs.shelfPromptDialog.returnValue = "";
    const onClose = () => {
      refs.shelfPromptDialog.removeEventListener("close", onClose);
      if (refs.shelfPromptDialog.returnValue !== DIALOG_CONFIRM_VALUE) {
        resolve(null);
        return;
      }
      resolve(refs.shelfPromptInput.value.trim());
    };
    refs.shelfPromptDialog.addEventListener("close", onClose);
    try {
      refs.shelfPromptDialog.showModal();
    } catch {
      refs.shelfPromptDialog.show();
    }
    refs.shelfPromptInput.focus();
  });
}

function ensurePromptValidation(refs: BookFormRefs): void {
  refs.shelfPromptForm.addEventListener("submit", (event) => {
    if (!(event.submitter instanceof HTMLButtonElement)) {
      return;
    }
    if (event.submitter.value !== DIALOG_CONFIRM_VALUE) {
      return;
    }
    if (refs.shelfPromptInput.value.trim()) {
      return;
    }
    event.preventDefault();
    refs.shelfPromptInput.focus();
  });
}

function promptViaBrowser() {
  const response = globalThis.prompt(CREATE_SHELF_PROMPT, "");
  if (response === null) {
    return null;
  }
  return String(response).trim();
}

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function shelfOptions(shelves: string[] = []): HTMLOptionElement[] {
  const options = [createOption(UNSHELVED_VALUE, UNSHELVED_LABEL)];
  shelves.forEach((shelfName) => {
    options.push(createOption(shelfName, shelfName));
  });
  options.push(createOption(SHELF_SELECT_CREATE_NEW, CREATE_SHELF_LABEL));
  return options;
}

function rememberSelectedShelf(select: HTMLSelectElement): void {
  select.dataset[DATA_KEY_PREVIOUS_SHELF] = select.value;
}

function previousShelf(select: HTMLSelectElement): string {
  return String(select.dataset[DATA_KEY_PREVIOUS_SHELF] || UNSHELVED_VALUE);
}

function caseInsensitiveMatch(left: string, right: string): boolean {
  return left.localeCompare(right, undefined, { sensitivity: "base" }) === 0;
}

function existingShelfValue(
  select: HTMLSelectElement,
  shelfName: string,
): string {
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

function collectShelfValues(select: HTMLSelectElement): string[] {
  const values: string[] = [];
  const options = Array.from(select.options);
  options.forEach((option) => {
    if (!option.value || option.value === SHELF_SELECT_CREATE_NEW) {
      return;
    }
    values.push(option.value);
  });
  return values;
}

function renderShelfOptions(
  select: HTMLSelectElement,
  shelves: string[],
  selectedShelf: string,
): void {
  const nodes = shelfOptions(shelves);
  select.replaceChildren(...nodes);
  if (selectedShelf) {
    select.value = selectedShelf;
    return;
  }
  select.value = UNSHELVED_VALUE;
}

function ensureShelfOption(select: HTMLSelectElement, shelfName: string): void {
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

function setSelectedShelf(
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

async function onCreateShelfSelected(refs: BookFormRefs): Promise<void> {
  const select = refs.shelfSelectInput;
  const fallbackShelf = previousShelf(select);
  let shelfName = null;
  try {
    shelfName = await promptViaDialog(refs);
  } catch {
    shelfName = promptViaBrowser();
  }
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

async function onShelfChange(refs: BookFormRefs): Promise<void> {
  const select = refs.shelfSelectInput;
  if (select.value === SHELF_SELECT_CREATE_NEW) {
    await onCreateShelfSelected(refs);
    return;
  }
  rememberSelectedShelf(select);
}

export function renderShelfPicker(
  refs: BookFormRefs,
  books: Book[] = [],
  selectedShelf = "",
): void {
  const shelves = uniqueShelves(books);
  setSelectedShelf(refs.shelfSelectInput, selectedShelf, shelves);
}

export function bindShelfPicker(refs: BookFormRefs): void {
  ensurePromptValidation(refs);
  refs.shelfSelectInput.addEventListener("change", async () => {
    await onShelfChange(refs);
  });
}
