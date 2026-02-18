// @ts-nocheck
import { bindBookLookup, syncProgressAndPages } from "../book_lookup.js";
import { bindDialogFocus, focusFirstError } from "../a11y.js";
import { applyLookupItem, clearForm, fillForm, parseFormBook } from "./form_state.js";
import { ensureBookFormLayoutFields } from "./form_layout.js";
import { getBookFormRefs } from "./form_refs.js";
import { createAfterBookPicker } from "./after_book_picker.js";
import { bindShelfPicker, renderShelfPicker } from "./shelf_picker.js";

function setSavingState(refs, busy) {
  refs.saveBtn.disabled = busy;
  refs.saveBtn.textContent = "Save Book";
  if (busy) {
    refs.saveBtn.textContent = "Saving...";
  }
}

export function createBookDialog(onSubmit, { getBooks = () => [] } = {}) {
  ensureBookFormLayoutFields();
  const refs = getBookFormRefs();
  bindShelfPicker(refs);
  const afterBookPicker = createAfterBookPicker(refs, getBooks);
  const dialogFocus = bindDialogFocus(refs.dialog, { initialFocusSelector: "#bookTitleInput" });
  const lookupControl = bindBookLookup({
    searchInput: refs.searchInput,
    resultsEl: refs.searchResults,
    metaEl: refs.lookupMeta,
    onPick: (item) => applyLookupItem(refs, item),
  });

  const close = () => dialogFocus.closeAndReturnFocus();
  const open = (book = null) => {
    dialogFocus.rememberOpener();
    clearForm(refs, lookupControl);
    afterBookPicker.openForBook(book);
    renderShelfPicker(refs, getBooks(), book?.shelf || "");
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
      refs.lookupMeta.textContent = error?.message || "Could not save this book.";
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

  const syncRefs = { pagesTotalInput: refs.pagesTotalInput, pagesReadInput: refs.pagesReadInput, progressInput: refs.progressInput };
  refs.pagesTotalInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "pages"));
  refs.pagesReadInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "pages"));
  refs.progressInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "progress"));
  return { open };
}
