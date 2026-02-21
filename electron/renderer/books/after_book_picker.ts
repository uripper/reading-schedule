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
  setUnknownSelectionLabel,
  type PickerState,
} from "./after_book_picker_render.js";
import type { Book } from "./types.js";

type GetBooks = () => Book[];

type AfterBookPicker = {
  openForBook: (book?: Book | null) => void;
};

export function createAfterBookPicker(
  refs: BookFormRefs,
  getBooks: GetBooks,
): AfterBookPicker {
  const state: PickerState = {
    activeIndex: NO_ACTIVE_INDEX,
    currentBookId: "",
    filtered: [],
    options: [],
    selectedBookId: "",
  };
  const render = (): void => {
    renderAfterBookResults(refs, state);
  };
  const clearResults = (): void => {
    state.filtered = [];
    state.activeIndex = NO_ACTIVE_INDEX;
  };
  const clearSelection = (): void => {
    state.selectedBookId = "";
    refs.blockedByInput.value = "";
  };
  const selectBook = (book: Book | null | undefined): void => {
    if (!book) {
      return;
    }
    state.selectedBookId = String(book.book_id || "");
    refs.blockedByInput.value = state.selectedBookId;
    refs.afterBookInput.value = optionLabel(book);
    clearResults();
    render();
  };
  const refreshOptions = (): void => {
    const availableBooks = getBooks().filter((book) => {
      return book?.book_id && book.book_id !== state.currentBookId;
    });
    state.options = availableBooks.toSorted(compareBooks);
  };
  const refreshFiltered = (clearChangedSelection: boolean): void => {
    const query = refs.afterBookInput.value.trim();
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
    clearResults,
    refs,
    refreshFiltered,
    render,
    selectBook,
    state,
  });
  const openForBook = (book: Book | null = null): void => {
    state.currentBookId = String(book?.book_id || "");
    refreshOptions();
    state.selectedBookId = "";
    refs.afterBookInput.value = "";
    refs.blockedByInput.value = "";
    const blockedById = String(book?.blocked_by || "");
    if (blockedById) {
      state.selectedBookId = blockedById;
      refs.blockedByInput.value = blockedById;
      const selected = state.options.find((item) => item.book_id === blockedById);
      if (selected) {
        refs.afterBookInput.value = optionLabel(selected);
      } else {
        setUnknownSelectionLabel(refs, blockedById);
      }
    }
    clearResults();
    render();
  };
  return { openForBook };
}
