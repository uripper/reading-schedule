import type { BookFormRefs } from "./form_refs.js";
import {
  compareBooks,
  labelsMatch,
  matchesQuery,
  optionLabel,
} from "./after_book_picker_helpers.js";
import { bindAfterBookPickerEvents } from "./after_book_picker_bindings.js";
import {
  FIRST_RESULT_INDEX,
  NO_ACTIVE_INDEX,
  renderAfterBookResults,
  selectedBook,
  type PickerState,
} from "./after_book_picker_render.js";
import { initializePickerForBook } from "./after_book_picker_open.js";
import type { Book } from "./types.js";

type GetBooks = () => Book[];

interface AfterBookPicker {
  openForBook(book?: Book | null): void;
}

/**
 * Creates the "blocked by" picker controller used in the book dialog.
 * @param refs Form references for picker input/results fields.
 * @param getBooks Callback returning the latest book list.
 * @returns Picker API exposing `openForBook`.
 */
export function createAfterBookPicker(
  refs: BookFormRefs,
  getBooks: GetBooks,
): AfterBookPicker {
  const formRefs = refs;
  const state: PickerState = {
    activeIndex: NO_ACTIVE_INDEX,
    currentBookId: "",
    filtered: [],
    options: [],
    selectedBookId: "",
  };
  const render = (): void => {
    renderAfterBookResults(formRefs, state);
  };
  const clearResults = (): void => {
    state.filtered = [];
    state.activeIndex = NO_ACTIVE_INDEX;
  };
  const clearSelection = (): void => {
    state.selectedBookId = "";
    formRefs.blockedByInput.value = "";
  };
  const selectBook = (book: Book | null | undefined): void => {
    if (!book) {
      return;
    }
    state.selectedBookId = String(book.book_id || "");
    formRefs.blockedByInput.value = state.selectedBookId;
    formRefs.afterBookInput.value = optionLabel(book);
    clearResults();
    render();
  };
  const refreshOptions = (): void => {
    const availableBooks = getBooks().filter((book) => {
      const bookId = String(book.book_id || "");
      if (bookId === "") {
        return false;
      }
      return bookId !== state.currentBookId;
    });
    state.options = availableBooks.toSorted(compareBooks);
  };
  const refreshFiltered = (clearChangedSelection: boolean): void => {
    const query = formRefs.afterBookInput.value.trim();
    if (clearChangedSelection) {
      const current = selectedBook(state);
      if (!query || !current || !labelsMatch(query, optionLabel(current))) {
        clearSelection();
      }
    }
    state.filtered = state.options.filter((book) => matchesQuery(book, query));
    state.activeIndex = NO_ACTIVE_INDEX;
    if (state.filtered.length) {
      state.activeIndex = FIRST_RESULT_INDEX;
    }
    render();
  };
  bindAfterBookPickerEvents({
    refs: formRefs,
    clearResults,
    refreshFiltered,
    render,
    selectBook,
    state,
  });
  const openForBook = (book: Book | null = null): void => {
    state.currentBookId = String(book?.book_id ?? "");
    refreshOptions();
    initializePickerForBook(formRefs, state, book);
    clearResults();
    render();
  };
  return { openForBook };
}
