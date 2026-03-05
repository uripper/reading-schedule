import type { ManualSessionBook } from "../../types/types.js";
import { booksMatchingTitleQuery } from "./details_manual_add_helpers.js";

const EMPTY_BOOK_OPTION_TEXT = "No matching books";
const EMPTY_BOOK_OPTION_VALUE = "";

/**
 * Builds a select option node for one manual-session book.
 * @param book - Manual-session book option.
 * @returns Select option element.
 */
function optionForBook(book: ManualSessionBook): HTMLOptionElement {
    const OPTION = document.createElement("option");
    OPTION.value = book.bookId;
    OPTION.textContent = book.title;
    return OPTION;
}

/**
 * Chooses initial preferred book id for manual-add dropdown selection.
 * @param defaultBookId - Optional default selected book id.
 * @param books - Available manual-session books.
 * @returns Preferred id when present; otherwise empty string.
 */
export function initialPreferredBookId(
    defaultBookId: string | undefined,
    books: ManualSessionBook[],
): string {
    if (defaultBookId === undefined || defaultBookId === "") {
        return "";
    }
    const HAS_DEFAULT_BOOK = books.some(
        (book) => book.bookId === defaultBookId,
    );
    if (!HAS_DEFAULT_BOOK) {
        return "";
    }
    return defaultBookId;
}

/**
 * Renders a disabled placeholder when no book matches the title filter.
 * @param bookSelect - Manual-add select element.
 */
function renderEmptyBookOptions(bookSelect: HTMLSelectElement): void {
    const NEXT_BOOK_SELECT = bookSelect;
    const OPTION = document.createElement("option");
    OPTION.value = EMPTY_BOOK_OPTION_VALUE;
    OPTION.textContent = EMPTY_BOOK_OPTION_TEXT;
    OPTION.disabled = true;
    OPTION.selected = true;
    NEXT_BOOK_SELECT.disabled = true;
    NEXT_BOOK_SELECT.replaceChildren(OPTION);
}

/**
 * Rebuilds manual-add select options from title filter and preferred selection.
 * @param bookSelect - Manual-add select element.
 * @param books - Available manual-session books.
 * @param query - Title filter query text.
 * @param preferredBookId - Book id to preserve when still visible.
 */
export function refreshBookOptions(
    bookSelect: HTMLSelectElement,
    books: ManualSessionBook[],
    query: string,
    preferredBookId: string,
): void {
    const NEXT_BOOK_SELECT = bookSelect;
    const FILTERED_BOOKS = booksMatchingTitleQuery(books, query);
    if (FILTERED_BOOKS.length === 0) {
        renderEmptyBookOptions(NEXT_BOOK_SELECT);
        return;
    }
    const OPTIONS = FILTERED_BOOKS.map((book) => optionForBook(book));
    NEXT_BOOK_SELECT.disabled = false;
    NEXT_BOOK_SELECT.replaceChildren(...OPTIONS);

    const HAS_PREFERRED_BOOK_ID =
        preferredBookId !== "" &&
        FILTERED_BOOKS.some((book) => book.bookId === preferredBookId);
    if (HAS_PREFERRED_BOOK_ID) {
        NEXT_BOOK_SELECT.value = preferredBookId;
        return;
    }
    NEXT_BOOK_SELECT.value = FILTERED_BOOKS[0].bookId;
}
