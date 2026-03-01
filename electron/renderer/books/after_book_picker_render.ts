import {
    type Book,
    type BookFormRefs,
    type PickerState,
} from "../../types/types.js";
import { optionLabel } from "./after_book_picker_helpers.js";

export const NO_ACTIVE_INDEX = -1;
export const FIRST_RESULT_INDEX = 0;
const UNKNOWN_BOOK_LABEL = "Unknown";
const ARIA_ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";

/**
 * Resolves currently selected book from picker state.
 * @param state Picker state.
 * @returns Selected book, or null when none is selected.
 */
export function selectedBook(state: PickerState): Book | null {
    if (!state.selectedBookId) {
        return null;
    }
    return (
        state.options.find((book) => book.book_id === state.selectedBookId) ??
        null
    );
}

/**
 * Renders after-book picker result options and combobox accessibility attributes.
 * @param refs Form references for picker controls.
 * @param state Picker state with filtered options and active index.
 */
export function renderAfterBookResults(
    refs: BookFormRefs,
    state: PickerState,
): void {
    const FORM_REFS = refs;
    FORM_REFS.afterBookResults.innerHTML = "";
    if (!state.filtered.length) {
        FORM_REFS.afterBookResults.classList.remove("has-items");
        FORM_REFS.afterBookInput.setAttribute("aria-expanded", "false");
        FORM_REFS.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
        return;
    }
    const ITEMS = state.filtered.map((book, index) => {
        const BUTTON = document.createElement("button");
        BUTTON.type = "button";
        BUTTON.className = "book-result book-result-inline";
        BUTTON.id = `after-book-option-${index}`;
        BUTTON.dataset.resultIndex = String(index);
        BUTTON.setAttribute("role", "option");
        BUTTON.setAttribute(
            "aria-selected",
            String(state.activeIndex === index),
        );
        BUTTON.textContent = optionLabel(book);
        BUTTON.classList.toggle("is-active", state.activeIndex === index);
        return BUTTON;
    });
    FORM_REFS.afterBookResults.replaceChildren(...ITEMS);
    FORM_REFS.afterBookResults.classList.add("has-items");
    FORM_REFS.afterBookInput.setAttribute("aria-expanded", "true");
    if (state.activeIndex > NO_ACTIVE_INDEX) {
        FORM_REFS.afterBookInput.setAttribute(
            ARIA_ACTIVE_DESCENDANT_ATTR,
            `after-book-option-${state.activeIndex}`,
        );
        return;
    }
    FORM_REFS.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
}

/**
 * Sets picker input label for a blocked-by id not found in available options.
 * @param refs Form references for picker controls.
 * @param blockedById Unknown blocked-by book id.
 */
export function setUnknownSelectionLabel(
    refs: BookFormRefs,
    blockedById: string,
): void {
    const FORM_REFS = refs;
    FORM_REFS.afterBookInput.value = `${UNKNOWN_BOOK_LABEL} (${blockedById})`;
}
