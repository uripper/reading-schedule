import type { Book, BookFormRefs, PickerState } from "../../types/types.ts";
import { optionLabel } from "./after_book_picker_helpers.ts";

export const NO_ACTIVE_INDEX = -1;
export const FIRST_RESULT_INDEX = 0;
const UNKNOWN_BOOK_LABEL = "Unknown";
const ARIA_ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";

/**
 * Resolves currently selected book from picker state.
 * @param state - Picker state.
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

function optionId(index: number): string {
    return `after-book-option-${index}`;
}

function setExpandedState(refs: BookFormRefs, expanded: boolean): void {
    refs.afterBookInput.setAttribute("aria-expanded", String(expanded));
}

function clearActiveDescendant(refs: BookFormRefs): void {
    refs.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
}

function renderEmptyResults(refs: BookFormRefs): void {
    refs.afterBookResults.classList.remove("has-items");
    setExpandedState(refs, false);
    clearActiveDescendant(refs);
}

function resultButton(
    book: Book,
    index: number,
    activeIndex: number,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    const IS_ACTIVE = activeIndex === index;
    BUTTON.type = "button";
    BUTTON.className = "book-result book-result-inline";
    BUTTON.id = optionId(index);
    BUTTON.dataset.resultIndex = String(index);
    BUTTON.setAttribute("role", "option");
    BUTTON.setAttribute("aria-selected", String(IS_ACTIVE));
    BUTTON.textContent = optionLabel(book);
    BUTTON.classList.toggle("is-active", IS_ACTIVE);
    return BUTTON;
}

function renderResultButtons(state: PickerState): HTMLButtonElement[] {
    return state.filtered.map((book, index) => {
        return resultButton(book, index, state.activeIndex);
    });
}

function syncActiveDescendant(refs: BookFormRefs, activeIndex: number): void {
    if (activeIndex > NO_ACTIVE_INDEX) {
        refs.afterBookInput.setAttribute(
            ARIA_ACTIVE_DESCENDANT_ATTR,
            optionId(activeIndex),
        );
        return;
    }
    clearActiveDescendant(refs);
}

/**
 * Renders after-book picker result options and combobox accessibility attributes.
 * @param refs - Form references for picker controls.
 * @param state - Picker state with filtered options and active index.
 */
export function renderAfterBookResults(
    refs: BookFormRefs,
    state: PickerState,
): void {
    const FORM_REFS = refs;
    FORM_REFS.afterBookResults.innerHTML = "";
    if (!state.filtered.length) {
        renderEmptyResults(FORM_REFS);
        return;
    }
    FORM_REFS.afterBookResults.replaceChildren(...renderResultButtons(state));
    FORM_REFS.afterBookResults.classList.add("has-items");
    setExpandedState(FORM_REFS, true);
    syncActiveDescendant(FORM_REFS, state.activeIndex);
}

/**
 * Sets picker input label for a blocked-by id not found in available options.
 * @param refs - Form references for picker controls.
 * @param blockedById - Unknown blocked-by book id.
 */
export function setUnknownSelectionLabel(
    refs: BookFormRefs,
    blockedById: string,
): void {
    const FORM_REFS = refs;
    FORM_REFS.afterBookInput.value = `${UNKNOWN_BOOK_LABEL} (${blockedById})`;
}
