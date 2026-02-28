import type { ManualSessionBook } from "../../types/types.js";
import { booksMatchingTitleQuery } from "./details_manual_add_helpers.js";

const EMPTY_BOOK_OPTION_TEXT = "No matching books";
const EMPTY_BOOK_OPTION_VALUE = "";

/**
 * Builds a select option node for one manual-session book.
 * @param book Manual-session book option.
 * @returns Select option element.
 */
function optionForBook(book: ManualSessionBook): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = book.bookId;
  option.textContent = book.title;
  return option;
}

/**
 * Chooses initial preferred book id for manual-add dropdown selection.
 * @param defaultBookId Optional default selected book id.
 * @param books Available manual-session books.
 * @returns Preferred id when present; otherwise empty string.
 */
export function initialPreferredBookId(
  defaultBookId: string | undefined,
  books: ManualSessionBook[],
): string {
  if (defaultBookId === undefined || defaultBookId === "") {
    return "";
  }
  const hasDefaultBook = books.some((book) => book.bookId === defaultBookId);
  if (!hasDefaultBook) {
    return "";
  }
  return defaultBookId;
}

/**
 * Renders a disabled placeholder when no book matches the title filter.
 * @param bookSelect Manual-add select element.
 */
function renderEmptyBookOptions(bookSelect: HTMLSelectElement): void {
  const nextBookSelect = bookSelect;
  const option = document.createElement("option");
  option.value = EMPTY_BOOK_OPTION_VALUE;
  option.textContent = EMPTY_BOOK_OPTION_TEXT;
  option.disabled = true;
  option.selected = true;
  nextBookSelect.disabled = true;
  nextBookSelect.replaceChildren(option);
}

/**
 * Rebuilds manual-add select options from title filter and preferred selection.
 * @param bookSelect Manual-add select element.
 * @param books Available manual-session books.
 * @param query Title filter query text.
 * @param preferredBookId Book id to preserve when still visible.
 */
export function refreshBookOptions(
  bookSelect: HTMLSelectElement,
  books: ManualSessionBook[],
  query: string,
  preferredBookId: string,
): void {
  const nextBookSelect = bookSelect;
  const filteredBooks = booksMatchingTitleQuery(books, query);
  if (filteredBooks.length === 0) {
    renderEmptyBookOptions(nextBookSelect);
    return;
  }
  const options = filteredBooks.map((book) => optionForBook(book));
  nextBookSelect.disabled = false;
  nextBookSelect.replaceChildren(...options);

  const hasPreferredBookId =
    preferredBookId !== "" &&
    filteredBooks.some((book) => book.bookId === preferredBookId);
  if (hasPreferredBookId) {
    nextBookSelect.value = preferredBookId;
    return;
  }
  nextBookSelect.value = filteredBooks[0].bookId;
}
