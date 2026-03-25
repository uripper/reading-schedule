import type { ManualSessionBook } from "../../types/types.ts";
import { booksMatchingTitleQuery } from "./details_manual_add_helpers.ts";

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

function selectedBookId(
    filteredBooks: ManualSessionBook[],
    preferredBookId: string,
): string {
    const HAS_PREFERRED_BOOK_ID =
        preferredBookId !== "" &&
        filteredBooks.some((book) => book.bookId === preferredBookId);
    if (HAS_PREFERRED_BOOK_ID) {
        return preferredBookId;
    }
    return filteredBooks[0]?.bookId ?? EMPTY_BOOK_OPTION_VALUE;
}

/**
 * Rebuilds manual-add select options from title filter and preferred selection.
 * @param options - Manual-add option refresh inputs.
 */
export function refreshBookOptions(options: {
    bookSelect: HTMLSelectElement;
    books: ManualSessionBook[];
    preferredBookId: string;
    query: string;
}): void {
    const NEXT_BOOK_SELECT = options.bookSelect;
    const FILTERED_BOOKS = booksMatchingTitleQuery(
        options.books,
        options.query,
    );
    if (FILTERED_BOOKS.length === 0) {
        renderEmptyBookOptions(NEXT_BOOK_SELECT);
        return;
    }
    const OPTIONS = FILTERED_BOOKS.map((book) => optionForBook(book));
    NEXT_BOOK_SELECT.disabled = false;
    NEXT_BOOK_SELECT.replaceChildren(...OPTIONS);
    const SELECTED_BOOK_ID = selectedBookId(
        FILTERED_BOOKS,
        options.preferredBookId,
    );
    if (SELECTED_BOOK_ID === EMPTY_BOOK_OPTION_VALUE) {
        return;
    }
    NEXT_BOOK_SELECT.value = SELECTED_BOOK_ID;
}
