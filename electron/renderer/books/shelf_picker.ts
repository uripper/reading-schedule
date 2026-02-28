import { type Book, type BookFormRefs } from "../../types/types.js";
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

/**
 * Handles create-shelf flow when special picker option is selected.
 * @param refs Book form references containing shelf controls.
 */
async function onCreateShelfSelected(refs: BookFormRefs): Promise<void> {
    const SELECT = refs.shelfSelectInput;
    const FALLBACK_SHELF = previousShelf(SELECT);
    const SHELF_NAME = await promptForShelfName(refs);
    if (SHELF_NAME === null || SHELF_NAME === "") {
        SELECT.value = FALLBACK_SHELF;
        return;
    }
    const EXISTING_VALUE = existingShelfValue(SELECT, SHELF_NAME);
    if (EXISTING_VALUE) {
        SELECT.value = EXISTING_VALUE;
        rememberSelectedShelf(SELECT);
        return;
    }
    ensureShelfOption(SELECT, SHELF_NAME);
    SELECT.value = SHELF_NAME;
    rememberSelectedShelf(SELECT);
}

/**
 * Handles shelf select changes and routes create-shelf behavior when needed.
 * @param refs Book form references containing shelf controls.
 */
async function onShelfChange(refs: BookFormRefs): Promise<void> {
    const SELECT = refs.shelfSelectInput;
    if (SELECT.value === SHELF_SELECT_CREATE_NEW) {
        await onCreateShelfSelected(refs);
        return;
    }
    rememberSelectedShelf(SELECT);
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
    const SHELVES = uniqueShelves(books);
    setSelectedShelf(refs.shelfSelectInput, selectedShelf, SHELVES);
}

/**
 * Binds shelf picker validation and change handlers.
 * @param refs Book form references containing shelf controls.
 */
export function bindShelfPicker(refs: BookFormRefs): void {
    ensurePromptValidation(refs);
    refs.shelfSelectInput.addEventListener("change", () => {
        onShelfChange(refs).catch(() => {
            const SELECT = refs.shelfSelectInput;
            SELECT.value = previousShelf(SELECT);
        });
    });
}
