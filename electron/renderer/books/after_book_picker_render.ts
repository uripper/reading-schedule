import type { BookFormRefs } from "./form_refs.js";
import { optionLabel } from "./after_book_picker_helpers.js";
import type { Book } from "./types.js";

export const NO_ACTIVE_INDEX = -1;
export const FIRST_RESULT_INDEX = 0;
export const UNKNOWN_BOOK_LABEL = "Unknown";
const ARIA_ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";

export interface PickerState {
  activeIndex: number;
  currentBookId: string;
  filtered: Book[];
  options: Book[];
  selectedBookId: string;
}

/**
 * Resolves currently selected book from picker state.
 * @param state Picker state.
 * @returns Selected book, or null when none is selected.
 */
export function selectedBook(state: PickerState): Book | null {
  if (!state.selectedBookId) {
    return null;
  }
  return state.options.find((book) => book.book_id === state.selectedBookId) || null;
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
  refs.afterBookResults.innerHTML = "";
  if (!state.filtered.length) {
    refs.afterBookResults.classList.remove("has-items");
    refs.afterBookInput.setAttribute("aria-expanded", "false");
    refs.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
    return;
  }
  const items = state.filtered.map((book, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-result book-result-inline";
    button.id = `after-book-option-${index}`;
    button.dataset.resultIndex = String(index);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.activeIndex === index));
    button.textContent = optionLabel(book);
    button.classList.toggle("is-active", state.activeIndex === index);
    return button;
  });
  refs.afterBookResults.replaceChildren(...items);
  refs.afterBookResults.classList.add("has-items");
  refs.afterBookInput.setAttribute("aria-expanded", "true");
  if (state.activeIndex > NO_ACTIVE_INDEX) {
    refs.afterBookInput.setAttribute(
      ARIA_ACTIVE_DESCENDANT_ATTR,
      `after-book-option-${state.activeIndex}`,
    );
    return;
  }
  refs.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
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
  refs.afterBookInput.value = `${UNKNOWN_BOOK_LABEL} (${blockedById})`;
}
