import type { bindDialogFocus } from "../../renderer/accessibility/index.js";
import type { BookFormRefs } from "../../renderer/books/form_refs.js";
import type { Book } from "../../renderer/books/types.js";

export interface BookDialogOptions {
  getBooks?(): Book[];
}

export interface LookupControl {
  clearResults(): void;
}

export interface AfterBookPickerControl {
  openForBook(book: Book | null): void;
}

export interface OpenBookDialogArgs {
  refs: BookFormRefs;
  dialogFocus: ReturnType<typeof bindDialogFocus>;
  lookupControl: LookupControl;
  afterBookPicker: AfterBookPickerControl;
  getBooks(): Book[];
  book: Book | null;
  dialogOptions: OpenDialogOptions;
}

export interface BookSubmitPayload {
  book: Book;
  applyScheduledDaysToShelf: boolean;
}

export interface OpenDialogOptions {
  defaultShelf?: string;
}
