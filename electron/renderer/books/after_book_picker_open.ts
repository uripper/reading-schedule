import {
    type Book,
    type BookFormRefs,
    type PickerState,
} from "../../types/types.js";
import { optionLabel } from "./after_book_picker_helpers.js";
import { setUnknownSelectionLabel } from "./after_book_picker_render.js";

/**
 * Initializes picker state/fields when opening the dialog for a given book.
 * @param refs Form references for picker controls.
 * @param state Mutable picker state.
 * @param book Book being edited, if any.
 */
export function initializePickerForBook(
    refs: BookFormRefs,
    state: PickerState,
    book: Book | null,
): void {
    const FORM_REFS = refs;
    const PICKER_STATE = state;
    PICKER_STATE.currentBookId = String(book?.book_id ?? "");
    PICKER_STATE.selectedBookId = "";
    FORM_REFS.afterBookInput.value = "";
    FORM_REFS.blockedByInput.value = "";

    const BLOCKED_BY_ID = String(book?.blocked_by ?? "");
    if (!BLOCKED_BY_ID) {
        return;
    }

    PICKER_STATE.selectedBookId = BLOCKED_BY_ID;
    FORM_REFS.blockedByInput.value = BLOCKED_BY_ID;
    const SELECTED = PICKER_STATE.options.find(
        (item) => item.book_id === BLOCKED_BY_ID,
    );
    if (SELECTED) {
        FORM_REFS.afterBookInput.value = optionLabel(SELECTED);
        return;
    }
    setUnknownSelectionLabel(FORM_REFS, BLOCKED_BY_ID);
}
