// @ts-nocheck
import { bindBookLookup, syncProgressAndPages } from "../book_lookup.js";
import { bindDialogFocus, focusFirstError } from "../a11y.js";
import { applyLookupItem, clearForm, fillForm, parseFormBook } from "./form_state.js";
import { getBookFormRefs } from "./form_refs.js";

function setSavingState(refs, busy) {
  refs.saveBtn.disabled = busy;
  refs.saveBtn.textContent = "Save Book";
  if (busy) {
    refs.saveBtn.textContent = "Saving...";
  }
}

function renderBlockedByOptions(refs, books = [], currentBookId = "", selectedBookId = "") {
  const select = refs.blockedByInput;
  const options = [{ value: "", label: "None" }];
  books.forEach((book) => {
    if (!book?.book_id || book.book_id === currentBookId) {
      return;
    }
    options.push({
      value: String(book.book_id),
      label: String(book.title || book.book_id),
    });
  });

  const hasSelected = options.some((option) => option.value === selectedBookId);
  if (selectedBookId && !hasSelected) {
    options.push({ value: selectedBookId, label: `Unknown (${selectedBookId})` });
  }

  const nodes = options.map((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    return node;
  });
  select.replaceChildren(...nodes);
  select.value = selectedBookId || "";
}

export function createBookDialog(onSubmit, { getBooks = () => [] } = {}) {
  const refs = getBookFormRefs();
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
    renderBlockedByOptions(refs, getBooks(), book?.book_id || "", book?.blocked_by || "");
    refs.dialogTitle.textContent = "Add Book";
    if (book) {
      refs.dialogTitle.textContent = "Edit Book";
    }
    if (book) {
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

  const syncRefs = {
    pagesTotalInput: refs.pagesTotalInput,
    pagesReadInput: refs.pagesReadInput,
    progressInput: refs.progressInput,
  };
  refs.pagesTotalInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "pages"));
  refs.pagesReadInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "pages"));
  refs.progressInput.addEventListener("input", () => syncProgressAndPages(syncRefs, "progress"));

  return { open };
}
