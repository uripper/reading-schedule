
import type { Book } from './types.js';
import type { BookFormRefs } from './form_refs.js';

const NO_ACTIVE_INDEX = -1;
const FIRST_RESULT_INDEX = 0;
const UNKNOWN_BOOK_LABEL = "Unknown";
const ARIA_ACTIVE_DESCENDANT_ATTR = "aria-activedescendant";

type PickerState = {
  currentBookId: string;
  selectedBookId: string;
  options: Book[];
  filtered: Book[];
  activeIndex: number;
};

function optionLabel(book: Book): string {
  const title = String(book.title || "Untitled");
  const author = String(book.author || "").trim();
  if (!author) {
    return title;
  }
  return `${title} - ${author}`;
}
function compareBooks(left: Book, right: Book): number {
  const titleCompare = String(left.title || "").localeCompare(String(right.title || ""), undefined, { sensitivity: "base" });
  if (titleCompare !== 0) {
    return titleCompare;
  }
  return String(left.author || "").localeCompare(String(right.author || ""), undefined, { sensitivity: "base" });
}
function wrapIndex(index: number, length: number): number {
  if (length <= 0) {
    return NO_ACTIVE_INDEX;
  }
  return ((index % length) + length) % length;
}
function matchesQuery(book: Book, query: string): boolean {
  if (!query) {
    return true;
  }
  return optionLabel(book).toLowerCase().includes(query.toLowerCase());
}
function lookupResultTarget(event: Event): HTMLElement | null {
  if (!(event.target instanceof HTMLElement)) {
    return null;
  }
  return event.target.closest(".book-result");
}
function labelsMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}
type GetBooks = () => Book[];

type AfterBookPicker = {
  openForBook: (book?: Book | null) => void;
};

export function createAfterBookPicker(refs: BookFormRefs, getBooks: GetBooks): AfterBookPicker {
  const state: PickerState = {
    currentBookId: "",
    selectedBookId: "",
    options: [],
    filtered: [],
    activeIndex: NO_ACTIVE_INDEX,
  };
  const clearResults = (): void => {
    state.filtered = [];
    state.activeIndex = NO_ACTIVE_INDEX;
  };
  const clearSelection = (): void => {
    state.selectedBookId = "";
    refs.blockedByInput.value = "";
  };
  const selectedBook = (): Book | null => {
    if (!state.selectedBookId) {
      return null;
    }
    return state.options.find((book) => book.book_id === state.selectedBookId) || null;
  };
  const render = (): void => {
    refs.afterBookResults.innerHTML = "";
    if (!state.filtered.length) {
      refs.afterBookResults.classList.remove("has-items");
      refs.afterBookInput.setAttribute("aria-expanded", "false");
      refs.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
      return;
    }
    const items = state.filtered.map((book, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "book-result book-result-inline";
      button.id = `after-book-option-${index}`;
      button.dataset.resultIndex = String(index);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(state.activeIndex === index));
      button.textContent = optionLabel(book);
      button.classList.toggle("is-active", state.activeIndex === index);
      return button;
    });
    refs.afterBookResults.replaceChildren(...items);
    refs.afterBookResults.classList.add("has-items");
    refs.afterBookInput.setAttribute("aria-expanded", "true");
    if (state.activeIndex > NO_ACTIVE_INDEX) {
      refs.afterBookInput.setAttribute(ARIA_ACTIVE_DESCENDANT_ATTR, `after-book-option-${state.activeIndex}`);
      return;
    }
    refs.afterBookInput.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTR);
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
    const sortedBooks = availableBooks.toSorted(compareBooks);
    state.options = sortedBooks;
  };
  const refreshFiltered = (clearChangedSelection: boolean): void => {
    const query = refs.afterBookInput.value.trim();
    if (clearChangedSelection) {
      const selected = selectedBook();
      if (!query || !selected || !labelsMatch(query, optionLabel(selected))) {
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
  refs.afterBookInput.addEventListener("focus", () => refreshFiltered(false));
  refs.afterBookInput.addEventListener("input", () => refreshFiltered(true));
  refs.afterBookInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.activeIndex = wrapIndex(state.activeIndex + 1, state.filtered.length);
      render();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.activeIndex = wrapIndex(state.activeIndex - 1, state.filtered.length);
      render();
      return;
    }
    if (event.key === "Enter" && state.activeIndex > NO_ACTIVE_INDEX) {
      event.preventDefault();
      selectBook(state.filtered[state.activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      clearResults();
      render();
      refs.afterBookInput.blur();
    }
  });
  refs.afterBookResults.addEventListener("mousemove", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    state.activeIndex = Number(target.dataset.resultIndex);
    render();
  });
  refs.afterBookResults.addEventListener("click", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    const resultIndex = Number(target.dataset.resultIndex);
    const selected = state.filtered[resultIndex];
    selectBook(selected);
  });
  document.addEventListener("click", (event: MouseEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (event.target === refs.afterBookInput || refs.afterBookResults.contains(event.target)) {
      return;
    }
    clearResults();
    render();
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
        refs.afterBookInput.value = `${UNKNOWN_BOOK_LABEL} (${blockedById})`;
      }
    }
    clearResults();
    render();
  };
  return { openForBook };
}
