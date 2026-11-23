/**
 * Draws the After Book menu (cover thumbnail, title, and author per row, in
 * the top layer next to the field) and the field's clear button.
 */
import type { Book, BookFormRefs, PickerState } from "../../types/types.ts";
import { syncFloatingMenu } from "../floating_menu.ts";
import { optionLabel } from "./after_book_picker_helpers.ts";
import { COVER_PLACEHOLDER } from "./constants.ts";
import { bookCoverSrc } from "./model-normalize.ts";

export const NO_ACTIVE_INDEX = -1;
export const FIRST_RESULT_INDEX = 0;
const UNKNOWN_BOOK_LABEL = "Unknown";
const ARIA_ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";
const CLEAR_BUTTON_ID = "bookAfterBookClearBtn";
const NO_AUTHOR_LABEL = "Unknown author";

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
    syncFloatingMenu(refs.afterBookResults, refs.afterBookInput, false);
    setExpandedState(refs, false);
    clearActiveDescendant(refs);
}

/**
 * Creates the small cover thumbnail for a row.
 * @param book - Candidate book.
 * @returns Decorative cover image.
 */
function resultThumb(book: Book): HTMLImageElement {
    const IMAGE = document.createElement("img");
    IMAGE.className = "book-result-thumb";
    IMAGE.alt = "";
    IMAGE.loading = "lazy";
    IMAGE.src = bookCoverSrc(book) || COVER_PLACEHOLDER;
    return IMAGE;
}

/**
 * Creates the title and author text of a row.
 * @param book - Candidate book.
 * @returns Text column.
 */
function resultText(book: Book): HTMLSpanElement {
    const TEXT = document.createElement("span");
    const TITLE = document.createElement("span");
    TITLE.className = "book-result-title";
    TITLE.textContent = String(book.title || "Untitled");
    const AUTHOR = document.createElement("span");
    AUTHOR.className = "book-result-meta";
    AUTHOR.textContent = String(book.author || "").trim() || NO_AUTHOR_LABEL;
    TEXT.append(TITLE, AUTHOR);
    return TEXT;
}

function resultButton(
    book: Book,
    index: number,
    activeIndex: number,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    const IS_ACTIVE = activeIndex === index;
    BUTTON.type = "button";
    BUTTON.className = "book-result after-book-option";
    BUTTON.id = optionId(index);
    BUTTON.tabIndex = -1;
    BUTTON.dataset.resultIndex = String(index);
    BUTTON.dataset.optionLabel = optionLabel(book);
    BUTTON.setAttribute("role", "option");
    BUTTON.setAttribute("aria-selected", String(IS_ACTIVE));
    BUTTON.append(resultThumb(book), resultText(book));
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
        const ROW = refs.afterBookResults.children[activeIndex];
        if (
            ROW instanceof HTMLElement &&
            typeof ROW.scrollIntoView === "function"
        ) {
            ROW.scrollIntoView({ block: "nearest" });
        }
        return;
    }
    clearActiveDescendant(refs);
}

/**
 * Shows the clear button only while a book is chosen.
 * @param state - Picker state.
 */
function syncClearButton(state: PickerState): void {
    const BUTTON = document.getElementById(CLEAR_BUTTON_ID);
    if (BUTTON !== null) {
        BUTTON.hidden = state.selectedBookId === "";
    }
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
    syncClearButton(state);
    FORM_REFS.afterBookResults.replaceChildren(...renderResultButtons(state));
    if (!state.filtered.length) {
        renderEmptyResults(FORM_REFS);
        return;
    }
    syncFloatingMenu(
        FORM_REFS.afterBookResults,
        FORM_REFS.afterBookInput,
        true,
    );
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
