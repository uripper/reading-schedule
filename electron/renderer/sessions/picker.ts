import type { SessionRefs } from "./refs.js";
import {
  matchesPickerQuery,
  renderPickerResults,
  type PickerBook,
} from "./picker_results.js";
import {
  handlePickerKeydown,
  shouldHidePickerOnDocumentClick,
} from "./picker_events.js";

export function createPickerController(
  refs: SessionRefs,
  getBooks: () => PickerBook[],
) {
  let filteredBooks: PickerBook[] = [];
  let pickerIndex = -1;
  let selectedBookId = "";
  const selectedBook = (): PickerBook | null => {
    return getBooks().find((book) => book.book_id === selectedBookId) || null;
  };
  const renderPicker = (): void => {
    renderPickerResults(refs, filteredBooks, pickerIndex, selectBook, (index) => {
      pickerIndex = index;
      renderPicker();
    });
  };
  const hidePicker = (): void => {
    filteredBooks = [];
    pickerIndex = -1;
    renderPicker();
  };
  const selectBook = (book: PickerBook | null): void => {
    if (!book) {
      selectedBookId = "";
      refs.input.value = "";
      refs.meta.textContent = "";
      return;
    }
    selectedBookId = book.book_id;
    refs.input.value = book.title;
    refs.meta.textContent = "Selected book";
    if (book.author) {
      refs.meta.textContent = `Selected: ${book.author}`;
    }
    hidePicker();
  };
  const refreshPicker = (): void => {
    const query = refs.input.value.trim().toLowerCase();
    filteredBooks = getBooks().filter((book) => matchesPickerQuery(book, query));
    pickerIndex = -1;
    if (filteredBooks.length) {
      pickerIndex = 0;
    }
    renderPicker();
  };
  const bind = (): void => {
    refs.input.addEventListener("input", refreshPicker);
    refs.input.addEventListener("focus", refreshPicker);
    refs.input.addEventListener("keydown", (event) => {
      handlePickerKeydown(event, {
        blurInput: () => refs.input.blur(),
        filteredBooks,
        hidePicker,
        pickerIndex,
        refreshPicker,
        renderPicker,
        selectBook,
        setPickerIndex: (nextIndex) => {
          pickerIndex = nextIndex;
        },
      });
    });
    document.addEventListener("click", (event) => {
      if (!shouldHidePickerOnDocumentClick(event, refs)) {
        return;
      }
      hidePicker();
    });
  };
  const selectBookById = (bookId: string): void => {
    const book = getBooks().find((row) => row.book_id === bookId) || null;
    if (!book) {
      return;
    }
    selectBook(book);
  };
  return {
    selectedBook,
    refreshPicker,
    selectBookById,
    bind,
  };
}
