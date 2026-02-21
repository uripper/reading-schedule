import { bindBookLookup, syncProgressAndPages } from "../book_lookup.js";
import { bindDialogFocus, focusFirstError } from "../a11y.js";
import {
  applyLookupItem,
  clearForm,
  fillForm,
  parseFormBook,
  syncFinishedAtField,
} from "./form_state.js";
import { ensureBookFormLayoutFields } from "./form_layout.js";
import { getBookFormRefs } from "./form_refs.js";
import { createAfterBookPicker } from "./after_book_picker.js";
import { bindShelfPicker, renderShelfPicker } from "./shelf_picker.js";
import { bindCoverUpload } from "./cover_upload.js";
import type { Book } from "./types.js";
import type { BookFormRefs } from "./form_refs.js";

type BookDialogOptions = {
  getBooks?: () => Book[];
};

export type OpenDialogOptions = {
  defaultShelf?: string;
};

function setSavingState(refs: BookFormRefs, busy: boolean): void {
  refs.saveBtn.disabled = busy;
  refs.saveBtn.textContent = "Save Book";
  if (busy) {
    refs.saveBtn.textContent = "Saving...";
  }
}

export function createBookDialog(
  onSubmit: (book: Book) => Promise<void> | void,
  { getBooks = () => [] }: BookDialogOptions = {},
) {
  ensureBookFormLayoutFields();
  const refs = getBookFormRefs();
  bindShelfPicker(refs);
  bindCoverUpload(refs);
  const afterBookPicker = createAfterBookPicker(refs, getBooks);
  const dialogFocus = bindDialogFocus(refs.dialog, {
    initialFocusSelector: "#bookTitleInput",
  });
  const lookupControl = bindBookLookup({
    searchInput: refs.searchInput,
    resultsEl: refs.searchResults,
    metaEl: refs.lookupMeta,
    onPick: (item) => applyLookupItem(refs, item),
  });

  const close = () => dialogFocus.closeAndReturnFocus();
  const open = (book: Book | null = null, options: OpenDialogOptions = {}) => {
    dialogFocus.rememberOpener();
    clearForm(refs, lookupControl);
    afterBookPicker.openForBook(book);
    let selectedShelf = String(options.defaultShelf || "").trim();
    if (book?.shelf) {
      selectedShelf = book.shelf;
    }
    renderShelfPicker(refs, getBooks(), selectedShelf);
    refs.dialogTitle.textContent = "Add Book";
    if (book) {
      refs.dialogTitle.textContent = "Edit Book";
      fillForm(refs, book);
    }
    refs.dialog.showModal();
    dialogFocus.focusInitialTarget();
  };

  refs.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setSavingState(refs, true);
      await onSubmit(parseFormBook(refs));
      close();
    } catch (error) {
      let message = "Could not save this book.";
      if (error instanceof Error && error.message) {
        message = error.message;
      }
      refs.lookupMeta.textContent = message;
      if (!focusFirstError(refs.form)) {
        refs.titleInput.focus();
      }
    } finally {
      setSavingState(refs, false);
    }
  });

  refs.cancelBtn.onclick = () => close();
  refs.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  const syncRefs = {
    pagesTotalInput: refs.pagesTotalInput,
    pagesReadInput: refs.pagesReadInput,
    progressInput: refs.progressInput,
  };
  refs.pagesTotalInput.addEventListener("input", () =>
    syncProgressAndPages(syncRefs, "pages"),
  );
  refs.pagesReadInput.addEventListener("input", () =>
    syncProgressAndPages(syncRefs, "pages"),
  );
  refs.progressInput.addEventListener("input", () =>
    syncProgressAndPages(syncRefs, "progress"),
  );
  refs.statusSelectInput.addEventListener("change", () =>
    syncFinishedAtField(refs),
  );
  return { open };
}
