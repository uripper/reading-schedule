import { optionLabel } from "./after_book_picker_helpers.js";
import type { Book, BookFormRefs, PickerState } from "../../types/types.js";
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
  const formRefs = refs;
  const pickerState = state;
  pickerState.currentBookId = String(book?.book_id ?? "");
  pickerState.selectedBookId = "";
  formRefs.afterBookInput.value = "";
  formRefs.blockedByInput.value = "";

  const blockedById = String(book?.blocked_by ?? "");
  if (!blockedById) {
    return;
  }

  pickerState.selectedBookId = blockedById;
  formRefs.blockedByInput.value = blockedById;
  const selected = pickerState.options.find((item) => item.book_id === blockedById);
  if (selected) {
    formRefs.afterBookInput.value = optionLabel(selected);
    return;
  }
  setUnknownSelectionLabel(formRefs, blockedById);
}
