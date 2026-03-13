import type { TodayBookNavigationActions } from "../../../types/types.ts";
import { scrollToBookCard } from "../../books/card_scroll_target.ts";
import { activateTab } from "../../tabs.ts";

const BOOKS_TAB_NAME = "books";

const DEFAULT_NAVIGATION_ACTIONS: TodayBookNavigationActions = {
    activateBooksTab: (): void => {
        activateTab(BOOKS_TAB_NAME, { focusPanel: true });
    },
    scrollToBook: (bookId: string): void => {
        scrollToBookCard(bookId);
    },
};

/**
 * Opens the Books tab and highlights the matching card for a Today book row.
 * @param bookId - Stable `book_id` for the selected scheduled book.
 * @param actions - Navigation actions used to activate the tab and scroll target.
 */
export function navigateToTodayBook(
    bookId: string,
    actions: TodayBookNavigationActions = DEFAULT_NAVIGATION_ACTIONS,
): void {
    const NORMALIZED_BOOK_ID = String(bookId || "").trim();
    if (NORMALIZED_BOOK_ID === "") {
        return;
    }
    actions.activateBooksTab();
    globalThis.requestAnimationFrame(() => {
        actions.scrollToBook(NORMALIZED_BOOK_ID);
    });
}
