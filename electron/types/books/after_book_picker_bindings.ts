import type { PickerState } from "../../renderer/books/after_book_picker_render.js";
import type { BookFormRefs } from "../../renderer/books/form_refs.js";
import type { Book } from "../../renderer/books/types.js";

export interface BindingArgs {
  clearResults(): void;
  refs: BookFormRefs;
  refreshFiltered(clearChangedSelection: boolean): void;
  render(): void;
  selectBook(book: Book | null | undefined): void;
  state: PickerState;
}
