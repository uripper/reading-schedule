/**
 * Draws the collection combobox: its option list (styled like the After Book
 * picker) and the chosen collections as removable chips underneath.
 */
import type {
    BookFormRefs,
    CollectionOption,
    CollectionPickerState,
} from "../../types/types.ts";

export const NO_ACTIVE_OPTION = -1;
export const OPTION_INDEX_KEY = "collectionOptionIndex";
export const CHIP_NAME_KEY = "collectionName";
export const CHIP_CLASS = "book-collection-chip";
const ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";

/**
 * Builds the DOM id of one option so the input can point at it.
 * @param index - Option position.
 * @returns Option element id.
 */
function optionId(index: number): string {
    return `book-collection-option-${index}`;
}

/**
 * Describes an option for its button text.
 * @param option - Existing or new collection option.
 * @returns Visible option text.
 */
export function collectionOptionLabel(option: CollectionOption): string {
    if (option.isNew) {
        return `Create "${option.name}"`;
    }
    return option.name;
}

/**
 * Creates one option button in the dropdown.
 * @param option - Option to show.
 * @param index - Option position.
 * @param activeIndex - Highlighted option position.
 * @returns Option button.
 */
function optionButton(
    option: CollectionOption,
    index: number,
    activeIndex: number,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    const IS_ACTIVE = index === activeIndex;
    BUTTON.type = "button";
    BUTTON.className = "book-result book-result-inline";
    BUTTON.classList.toggle("book-collection-create-option", option.isNew);
    BUTTON.classList.toggle("is-active", IS_ACTIVE);
    BUTTON.id = optionId(index);
    BUTTON.tabIndex = -1;
    BUTTON.dataset[OPTION_INDEX_KEY] = String(index);
    BUTTON.setAttribute("role", "option");
    BUTTON.setAttribute("aria-selected", String(IS_ACTIVE));
    BUTTON.textContent = collectionOptionLabel(option);
    return BUTTON;
}

/**
 * Points the combobox at the highlighted option for screen readers.
 * @param input - Combobox input.
 * @param activeIndex - Highlighted option position.
 */
function syncActiveDescendant(
    input: HTMLInputElement,
    activeIndex: number,
): void {
    if (activeIndex === NO_ACTIVE_OPTION) {
        input.removeAttribute(ACTIVE_DESCENDANT_ATTR);
        return;
    }
    input.setAttribute(ACTIVE_DESCENDANT_ATTR, optionId(activeIndex));
}

/**
 * Shows the open dropdown's options, or hides it when closed or empty.
 * @param refs - Book form references for the collection controls.
 * @param state - Picker state with options and the highlighted option.
 */
export function renderCollectionResults(
    refs: BookFormRefs,
    state: CollectionPickerState,
): void {
    const IS_OPEN = state.open && state.options.length > 0;
    const BUTTONS = state.options.map((option, index) => {
        return optionButton(option, index, state.activeIndex);
    });
    refs.collectionResults.replaceChildren(...BUTTONS);
    refs.collectionResults.classList.toggle("has-items", IS_OPEN);
    refs.collectionInput.setAttribute("aria-expanded", String(IS_OPEN));
    let activeIndex = NO_ACTIVE_OPTION;
    if (IS_OPEN) {
        activeIndex = state.activeIndex;
    }
    syncActiveDescendant(refs.collectionInput, activeIndex);
}

/**
 * Creates a chip that removes its collection when clicked.
 * @param name - Collection name.
 * @returns Chip button.
 */
function collectionChip(name: string): HTMLButtonElement {
    const CHIP = document.createElement("button");
    CHIP.type = "button";
    CHIP.className = `btn btn-compact ${CHIP_CLASS}`;
    CHIP.dataset[CHIP_NAME_KEY] = name;
    CHIP.title = `Remove from ${name}`;
    CHIP.setAttribute("aria-label", `Remove from ${name}`);
    const ICON = document.createElement("span");
    ICON.className = "icon icon-x";
    ICON.setAttribute("aria-hidden", "true");
    CHIP.append(name, ICON);
    return CHIP;
}

/**
 * Lists the book's collections as chips under the combobox.
 * @param refs - Book form references for the collection controls.
 * @param names - Collections the book belongs to, already sorted.
 */
export function renderCollectionChips(
    refs: BookFormRefs,
    names: string[],
): void {
    refs.collectionChips.replaceChildren(...names.map(collectionChip));
}
