import { bindDialogFocus, focusFirstError } from '../accessibility/index.js';
import { bindBookLookup } from '../book_lookup.js';
import { createAfterBookPicker } from './after_book_picker.js';
import { bindCoverUpload } from './cover_upload.js';
import { bindBookDialogProgressSync } from './dialog_progress_sync.js';
import { ensureBookFormLayoutFields } from './form_layout.js';
import { getBookFormRefs } from './form_refs.js';
import { applyLookupItem, clearForm, fillForm, parseFormBook } from './form_state.js';
import { bindShelfPicker, renderShelfPicker } from './shelf_picker.js';

import type {
  Book,
  BookDialogController,
  BookDialogOptions,
  BookFormRefs,
  BookSubmitPayload,
  OpenBookDialogArgs,
  OpenDialogOptions,
} from "../../types/types.js";

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
 * Resolves the live books getter from optional dialog options.
 * @param options Optional dialog dependencies.
 * @returns Function returning the current books collection.
 */
function booksGetter(options: BookDialogOptions): () => Book[] {
  return (): Book[] => {
    if (options.getBooks !== undefined) {
      return options.getBooks();
    }
    return [];
  };
}

/**
 * Resolves a user-facing error message from unknown save failures.
 * @param error Unknown error thrown by submit handlers.
 * @returns User-visible save message.
 */
function saveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Could not save this book.";
}

/**
 * Opens dialog UI and applies add/edit form state.
 * @param args Dialog open dependencies and target book state.
 * @param args.refs Book form references.
 * @param args.dialogFocus Dialog focus manager.
 * @param args.lookupControl Lookup clear helper used during open.
 * @param args.afterBookPicker After-book picker controller for blocker links.
 * @param args.getBooks Getter returning current books.
 * @param args.book Existing book in edit mode, or null for add mode.
 * @param args.dialogOptions Optional open options such as default shelf.
 */
function openBookDialog(
  args: OpenBookDialogArgs,
): void {
  const formRefs = args.refs;
  const book = args.book;
  args.dialogFocus.rememberOpener();
  clearForm(formRefs, args.lookupControl);
  args.afterBookPicker.openForBook(book);
  let selectedShelf = String(args.dialogOptions.defaultShelf ?? "").trim();
  if (book !== null && book.shelf !== "") {
    selectedShelf = book.shelf;
  }
  renderShelfPicker(formRefs, args.getBooks(), selectedShelf);
  formRefs.dialogTitle.textContent = "Add Book";
  if (book) {
    formRefs.dialogTitle.textContent = "Edit Book";
    fillForm(formRefs, book);
  }
  formRefs.dialog.showModal();
  args.dialogFocus.focusInitialTarget();
}

/**
 * Creates the add/edit book dialog controller and binds its form behavior.
 * @param onSubmit Callback invoked with the parsed form payload on submit.
 * @param options Optional dialog dependencies.
 * @param options.getBooks Returns current books for shelf and related UI helpers.
 * @returns Dialog API exposing the `open` function.
 */
export function createBookDialog(
  onSubmit: (payload: BookSubmitPayload) => Promise<void> | void,
  options: BookDialogOptions = {},
): BookDialogController {
  const getBooks = booksGetter(options);
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
    openBookDialog({
      refs,
      dialogFocus,
      lookupControl,
      afterBookPicker,
      getBooks,
      book,
      dialogOptions,
    });
  };

  refs.form.addEventListener("submit", (event) => {
    event.preventDefault();
    setSavingState(refs, true);
    const payload = {
      book: parseFormBook(refs),
      applyScheduledDaysToShelf: refs.applyScheduledDaysToShelfInput.checked,
    };
    Promise.resolve(onSubmit(payload))
      .then(() => {
        close();
      })
      .catch((error: unknown) => {
        refs.lookupMeta.textContent = saveErrorMessage(error);
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
