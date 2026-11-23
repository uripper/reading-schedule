/**
 * Draws the collection combobox: its menu (shown in the top layer next to
 * the field) and the chosen collections as removable chips inside the field.
 */
import type {
    BookFormRefs,
    CollectionOption,
    CollectionPickerState,
} from "../../types/types.ts";
import { syncFloatingMenu } from "../floating_menu.ts";
import { highlightedLabel } from "./text_match.ts";

export const NO_ACTIVE_OPTION = -1;
export const OPTION_INDEX_KEY = "collectionOptionIndex";
export const CHIP_NAME_KEY = "collectionName";
export const CHIP_CLASS = "book-collection-chip";
const ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";
const NEW_COLLECTION_LABEL = "New collection…";

/**
 * Builds the DOM id of one option so the input can point at it.
 * @param index - Option position.
 * @returns Option element id.
 */
function optionId(index: number): string {
    return `book-collection-option-${index}`;
}

/**
 * Describes a row in words.
 * @param option - Collection row.
 * @returns Visible row text.
 */
export function collectionOptionLabel(option: CollectionOption): string {
    if (option.kind === "create") {
        return `Create "${option.name}"`;
    }
    if (option.kind === "new") {
        return NEW_COLLECTION_LABEL;
    }
    return option.name;
}

/**
 * Creates the row icon: a check for collections (shown when chosen) and a
 * plus for the create actions.
 * @param option - Collection row.
 * @returns Decorative icon.
 */
function optionIcon(option: CollectionOption): HTMLSpanElement {
    const ICON = document.createElement("span");
    let name = "icon-plus";
    if (option.kind === "existing") {
        name = "icon-check";
    }
    ICON.className = `icon book-result-icon ${name}`;
    ICON.setAttribute("aria-hidden", "true");
    return ICON;
}

/**
 * Creates one row in the menu.
 * @param option - Row to show.
 * @param index - Row position.
 * @param activeIndex - Highlighted row position.
 * @returns Row button.
 */
function optionButton(
    option: CollectionOption,
    index: number,
    activeIndex: number,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    const TEXT = collectionOptionLabel(option);
    BUTTON.type = "button";
    BUTTON.className = `book-result book-collection-option is-${option.kind}`;
    BUTTON.classList.toggle("is-active", index === activeIndex);
    BUTTON.id = optionId(index);
    BUTTON.tabIndex = -1;
    BUTTON.dataset[OPTION_INDEX_KEY] = String(index);
    BUTTON.dataset.optionLabel = TEXT;
    BUTTON.setAttribute("role", "option");
    BUTTON.setAttribute("aria-selected", String(option.selected));
    BUTTON.append(optionIcon(option), highlightedLabel(TEXT, option.match));
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
 * Scrolls the highlighted row into view inside the menu.
 * @param refs - Book form references for the collection controls.
 * @param activeIndex - Highlighted row position.
 */
function revealActiveOption(refs: BookFormRefs, activeIndex: number): void {
    const ROW = refs.collectionResults.children[activeIndex];
    if (
        ROW instanceof HTMLElement &&
        typeof ROW.scrollIntoView === "function"
    ) {
        ROW.scrollIntoView({ block: "nearest" });
    }
}

/**
 * Shows the open menu's rows, or hides it when closed or empty.
 * @param refs - Book form references for the collection controls.
 * @param state - Picker state with rows and the highlighted row.
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
    const ANCHOR = refs.collectionChips.parentElement ?? refs.collectionInput;
    syncFloatingMenu(refs.collectionResults, ANCHOR, IS_OPEN);
    refs.collectionInput.setAttribute("aria-expanded", String(IS_OPEN));
    let activeIndex = NO_ACTIVE_OPTION;
    if (IS_OPEN) {
        activeIndex = state.activeIndex;
        revealActiveOption(refs, activeIndex);
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
 * Lists the book's collections as chips inside the combobox field.
 * @param refs - Book form references for the collection controls.
 * @param names - Collections the book belongs to, already sorted.
 */
export function renderCollectionChips(
    refs: BookFormRefs,
    names: string[],
): void {
    refs.collectionChips.replaceChildren(...names.map(collectionChip));
}
