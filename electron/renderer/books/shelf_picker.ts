import { SHELF_SELECT_CREATE_NEW, uniqueShelves } from "./shelf.js";
import {
  ensureShelfOption,
  existingShelfValue,
  previousShelf,
  rememberSelectedShelf,
  setSelectedShelf,
} from "./shelf_picker_options.js";
import {
  ensurePromptValidation,
  promptForShelfName,
} from "./shelf_picker_prompt.js";

import type { Book, BookFormRefs } from "../../types/types.js";
/**
 * Handles create-shelf flow when special picker option is selected.
 * @param refs Book form references containing shelf controls.
 */
async function onCreateShelfSelected(refs: BookFormRefs): Promise<void> {
  const select = refs.shelfSelectInput;
  const fallbackShelf = previousShelf(select);
  const shelfName = await promptForShelfName(refs);
  if (shelfName === null || shelfName === "") {
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

/**
 * Handles shelf select changes and routes create-shelf behavior when needed.
 * @param refs Book form references containing shelf controls.
 */
async function onShelfChange(refs: BookFormRefs): Promise<void> {
  const select = refs.shelfSelectInput;
  if (select.value === SHELF_SELECT_CREATE_NEW) {
    await onCreateShelfSelected(refs);
    return;
  }
  rememberSelectedShelf(select);
}

/**
 * Renders shelf picker options from current books and selected value.
 * @param refs Book form references containing shelf controls.
 * @param books Books used to derive unique shelf options.
 * @param selectedShelf Shelf value to select after rendering.
 */
export function renderShelfPicker(
  refs: BookFormRefs,
  books: Book[] = [],
  selectedShelf = "",
): void {
  const shelves = uniqueShelves(books);
  setSelectedShelf(refs.shelfSelectInput, selectedShelf, shelves);
}

/**
 * Binds shelf picker validation and change handlers.
 * @param refs Book form references containing shelf controls.
 */
export function bindShelfPicker(refs: BookFormRefs): void {
  ensurePromptValidation(refs);
  refs.shelfSelectInput.addEventListener("change", () => {
    onShelfChange(refs).catch(() => {
      const select = refs.shelfSelectInput;
      select.value = previousShelf(select);
    });
  });
}
