import type {
    Book,
    BooksControllerRefs,
    BooksViewState,
    RenderableBooksRefs,
} from "../../types/types.js";
import {
    normalizeTitleFilterQuery,
    titleMatchesNormalizedQuery,
} from "../title_filter.js";
import { shelfFilterMatches } from "./shelf.js";
import { sortBooks } from "./sort.js";
import { statusFilterMatches } from "./status.js";

/**
 * Checks whether a book title matches the active case-insensitive text filter.
 * @param book Book to test.
 * @param titleFilter Active title filter text.
 * @returns `true` when filter is empty or title contains the filter substring.
 */
export function matchesTitleFilter(book: Book, titleFilter: string): boolean {
    const normalizedFilter = normalizeTitleFilterQuery(titleFilter);
    return titleMatchesNormalizedQuery(book.title, normalizedFilter);
}

/**
 * Validates render-critical DOM references for the books controller.
 * @param refs Controller references that may still be nullable.
 * @returns Resolved render references when all required nodes exist; otherwise `null`.
 */
export function resolveRenderableRefs(
    refs: BooksControllerRefs,
): RenderableBooksRefs | null {
    if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
        return null;
    }
    if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
        return null;
    }
    if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
        return null;
    }
    if (!(refs.sortDirectionBtn instanceof HTMLButtonElement)) {
        return null;
    }
    if (
        !(refs.grid instanceof HTMLElement) ||
        !(refs.empty instanceof HTMLElement)
    ) {
        return null;
    }
    return {
        shelfFilterSelect: refs.shelfFilterSelect,
        groupBySelect: refs.groupBySelect,
        statusFilterSelect: refs.statusFilterSelect,
        sortDirectionBtn: refs.sortDirectionBtn,
        grid: refs.grid,
        empty: refs.empty,
    };
}

/**
 * Sorts and filters books based on current controller view options.
 * @param books Source books to evaluate.
 * @param viewState Active filter and sort selections.
 * @param finishDateByBookId Planner-derived finish date lookup keyed by `book_id`.
 * @returns Books visible in the current controller view.
 */
export function visibleBooksForView(
    books: Book[],
    viewState: BooksViewState,
    finishDateByBookId: Record<string, string>,
): Book[] {
    return sortBooks(
        books,
        viewState.sortBy,
        viewState.sortDirection,
        finishDateByBookId,
    ).filter((book) => {
        if (!matchesTitleFilter(book, viewState.titleFilter)) {
            return false;
        }
        if (!shelfFilterMatches(book, viewState.shelfFilter)) {
            return false;
        }
        return statusFilterMatches(book, viewState.statusFilter);
    });
}
