import { bindBookLookup, syncProgressAndPages } from "../book_lookup.js";
import { applyLookupItem, clearForm, fillForm, parseFormBook } from "./form_state.js";
import { getBookFormRefs } from "./form_refs.js";

function setSavingState(refs, busy) {
  refs.saveBtn.disabled = busy;
  refs.saveBtn.textContent = busy ? "Saving..." : "Save Book";
}

export function createBookDialog(onSubmit) {
  const refs = getBookFormRefs();
  const lookupControl = bindBookLookup({
    searchInput: refs.searchInput,
    resultsEl: refs.searchResults,
    metaEl: refs.lookupMeta,
    onPick: (item) => applyLookupItem(refs, item),
  });

  const close = () => refs.dialog.open && refs.dialog.close();
  const open = (book = null) => {
    clearForm(refs, lookupControl);
    refs.dialogTitle.textContent = book ? "Edit Book" : "Add Book";
    if (book) fillForm(refs, book);
    refs.dialog.showModal();
    refs.titleInput.focus();
  };

  refs.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setSavingState(refs, true);
      await onSubmit(parseFormBook(refs));
      close();
    } catch (error) {
      refs.lookupMeta.textContent = error?.message || "Could not save this book.";
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
