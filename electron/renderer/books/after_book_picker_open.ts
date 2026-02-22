import { optionLabel } from "./after_book_picker_helpers.js";
import type { BookFormRefs } from "./form_refs.js";
import { setUnknownSelectionLabel, type PickerState } from "./after_book_picker_render.js";
import type { Book } from "./types.js";

/**
 *
 * @param refs
 * @param state
 * @param book
 */
export function initializePickerForBook(
  refs: BookFormRefs,
  state: PickerState,
  book: Book | null,
): void {
  state.currentBookId = String(book?.book_id || "");
  state.selectedBookId = "";
  refs.afterBookInput.value = "";
  refs.blockedByInput.value = "";

  const blockedById = String(book?.blocked_by || "");
  if (!blockedById) {
    return;
  }

  state.selectedBookId = blockedById;
  refs.blockedByInput.value = blockedById;
  const selected = state.options.find((item) => item.book_id === blockedById);
  if (selected) {
    refs.afterBookInput.value = optionLabel(selected);
    return;
  }
  setUnknownSelectionLabel(refs, blockedById);
}
