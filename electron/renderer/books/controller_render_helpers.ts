import type {
    Book,
    BooksControllerRefs,
    BooksViewState,
    RenderableBooksRefs,
} from "../../types/types.ts";
import {
    normalizeTitleFilterQuery,
    titleMatchesNormalizedQuery,
} from "../title_filter.ts";
import { shelfFilterMatches } from "./shelf.ts";
import { sortBooks } from "./sort.ts";
import { statusFilterMatches } from "./status.ts";

/**
 * Checks whether a book title matches the active case-insensitive text filter.
 * @param book - Book to test.
 * @param titleFilter - Active title filter text.
 * @returns `true` when filter is empty or title contains the filter substring.
 */
function matchesTitleFilter(book: Book, titleFilter: string): boolean {
    const NORMALIZED_FILTER = normalizeTitleFilterQuery(titleFilter);
    return titleMatchesNormalizedQuery(book.title, NORMALIZED_FILTER);
}

/**
 * Validates render-critical DOM references for the books controller.
 * @param refs - Controller references that may still be nullable.
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
        !(refs.grid instanceof HTMLElement && refs.empty instanceof HTMLElement)
    ) {
        return null;
    }
    return {
        empty: refs.empty,
        grid: refs.grid,
        groupBySelect: refs.groupBySelect,
        shelfFilterSelect: refs.shelfFilterSelect,
        sortDirectionBtn: refs.sortDirectionBtn,
        statusFilterSelect: refs.statusFilterSelect,
    };
}

/**
 * Sorts and filters books based on current controller view options.
 * @param books - Source books to evaluate.
 * @param viewState - Active filter and sort selections.
 * @param finishDateByBookId - Planner-derived finish date lookup keyed by `book_id`.
 * @returns Books visible in the current controller view.
 */
export function visibleBooksForView(
    books: Book[],
    viewState: BooksViewState,
    finishDateByBookId: Record<string, string>,
): Book[] {
    return sortBooks({
        books,
        finishDateByBookId,
        sortBy: viewState.sortBy,
        sortDirection: viewState.sortDirection,
    }).filter((book) => {
        if (!matchesTitleFilter(book, viewState.titleFilter)) {
            return false;
        }
        if (!shelfFilterMatches(book, viewState.shelfFilter)) {
            return false;
        }
        return statusFilterMatches(book, viewState.statusFilter);
    });
}
