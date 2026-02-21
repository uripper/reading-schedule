import { SHELF_SELECT_CREATE_NEW, uniqueShelves } from "./shelf.js";
import type { Book } from "./types.js";
import type { BookFormRefs } from "./form_refs.js";
import { ensurePromptValidation, promptForShelfName } from "./shelf_picker_prompt.js";
import {
  ensureShelfOption,
  existingShelfValue,
  previousShelf,
  rememberSelectedShelf,
  setSelectedShelf,
} from "./shelf_picker_options.js";

async function onCreateShelfSelected(refs: BookFormRefs): Promise<void> {
  const select = refs.shelfSelectInput;
  const fallbackShelf = previousShelf(select);
  const shelfName = await promptForShelfName(refs);
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
