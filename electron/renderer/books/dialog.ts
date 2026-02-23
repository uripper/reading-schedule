import { bindBookLookup } from "../book_lookup.js";
import { bindDialogFocus, focusFirstError } from "../accessibility/index.js";
import {
  applyLookupItem,
  clearForm,
  fillForm,
  parseFormBook,
} from "./form_state.js";
import { ensureBookFormLayoutFields } from "./form_layout.js";
import { getBookFormRefs, type BookFormRefs } from "./form_refs.js";
import { createAfterBookPicker } from "./after_book_picker.js";
import { bindShelfPicker, renderShelfPicker } from "./shelf_picker.js";
import { bindCoverUpload } from "./cover_upload.js";
import { bindBookDialogProgressSync } from "./dialog_progress_sync.js";
import type { BookDialogController } from "./controller_types.js";
import type { Book } from "./types.js";

interface BookDialogOptions {
  getBooks?(): Book[];
}

export interface OpenDialogOptions {
  defaultShelf?: string;
}

/**
 * Updates the save button state while a dialog submission is in progress.
 * @param refs Resolved DOM references for the book dialog.
 * @param busy True while the save action is running.
 */
function setSavingState(refs: BookFormRefs, busy: boolean): void {
  const saveButton = refs.saveBtn;
  saveButton.disabled = busy;
  saveButton.textContent = "Save Book";
  if (busy) {
    saveButton.textContent = "Saving...";
  }
}

/**
 * Creates the add/edit book dialog controller and binds its form behavior.
 * @param onSubmit Callback invoked with the parsed form payload on submit.
 * @param options Optional dialog dependencies.
 * @param options.getBooks Returns current books for shelf and related UI helpers.
 * @returns Dialog API exposing the `open` function.
 */
export function createBookDialog(
  onSubmit: (book: Book) => Promise<void> | void,
  options: BookDialogOptions = {},
): BookDialogController {
  const getBooks = (): Book[] => {
    if (options.getBooks !== undefined) {
      return options.getBooks();
    }
    return [];
  };
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
    onPick: (item) => {
      applyLookupItem(refs, item);
    },
  });

  const close = (): void => {
    dialogFocus.closeAndReturnFocus();
  };
  const open = (
    book: Book | null = null,
    dialogOptions: OpenDialogOptions = {},
  ): void => {
    dialogFocus.rememberOpener();
    clearForm(refs, lookupControl);
    afterBookPicker.openForBook(book);
    let selectedShelf = String(dialogOptions.defaultShelf ?? "").trim();
    if (book !== null && book.shelf !== "") {
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

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
    setSavingState(refs, true);
    Promise.resolve(onSubmit(parseFormBook(refs)))
      .then(() => {
        close();
      })
      .catch((error: unknown) => {
        let message = "Could not save this book.";
        if (error instanceof Error && error.message) {
          message = error.message;
        }
        refs.lookupMeta.textContent = message;
        if (!focusFirstError(refs.form)) {
          refs.titleInput.focus();
        }
      })
      .finally(() => {
        setSavingState(refs, false);
      });
  });

  refs.cancelBtn.onclick = (): void => {
    close();
  };
  refs.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  bindBookDialogProgressSync(refs);
  return { open };
}
