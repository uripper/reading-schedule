/** Filters and sorts Library books for rendering. */
import type {
    Book,
    BooksControllerRefs,
    BooksViewState,
    RenderableBooksRefs,
} from "../../types/types.ts";
import {
    allKeywordsMatchFields,
    normalizeTitleFilterQuery,
} from "../title_filter.ts";
import { bookKeywordFields } from "./keyword-search.ts";
import { SHELF_FILTER_ALL, shelfFilterMatches } from "./shelf.ts";
import { sortBooks } from "./sort.ts";
import { statusFilterMatches } from "./status.ts";
import { BOOK_STATUS_FILTER_ALL } from "./status_catalog.ts";

/**
 * Checks whether a book matches the active case-insensitive keyword filter.
 * @param book - Book to test.
 * @param titleFilter - Active keyword filter text.
 * @returns `true` when filter is empty or every keyword matches some field
 * from `bookKeywordFields`.
 */
export function matchesTitleFilter(book: Book, titleFilter: string): boolean {
    const NORMALIZED_FILTER = normalizeTitleFilterQuery(titleFilter);
    return allKeywordsMatchFields(bookKeywordFields(book), NORMALIZED_FILTER);
}

/**
 * Checks whether the select/button refs needed for rendering are present.
 * @param refs - Controller refs under validation.
 * @returns `true` when toolbar refs are usable.
 */
function hasRenderableToolbarRefs(refs: BooksControllerRefs): boolean {
    if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
        return false;
    }
    if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
        return false;
    }
    if (!(refs.sortBySelect instanceof HTMLSelectElement)) {
        return false;
    }
    if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
        return false;
    }
    return refs.sortDirectionBtn instanceof HTMLButtonElement;
}

/**
 * Checks whether the grid and empty-state nodes are present.
 * @param refs - Controller refs under validation.
 * @returns `true` when content refs are usable.
 */
function hasRenderableContentRefs(refs: BooksControllerRefs): boolean {
    return (
        refs.grid instanceof HTMLElement && refs.empty instanceof HTMLElement
    );
}

/**
 * Validates render-critical DOM references for the books controller.
 * @param refs - Controller references that may still be nullable.
 * @returns Resolved render references when all required nodes exist; otherwise `null`.
 */
export function resolveRenderableRefs(
    refs: BooksControllerRefs,
): RenderableBooksRefs | null {
    if (!hasRenderableToolbarRefs(refs)) {
        return null;
    }
    if (!hasRenderableContentRefs(refs)) {
        return null;
    }
    return {
        empty: refs.empty as HTMLElement,
        grid: refs.grid as HTMLElement,
        groupBySelect: refs.groupBySelect as HTMLSelectElement,
        shelfFilterSelect: refs.shelfFilterSelect as HTMLSelectElement,
        sortBySelect: refs.sortBySelect as HTMLSelectElement,
        sortDirectionBtn: refs.sortDirectionBtn as HTMLButtonElement,
        statusFilterSelect: refs.statusFilterSelect as HTMLSelectElement,
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

/** Restores the unfiltered Library view and its search field. */
export function clearBookFilters(
    refs: BooksControllerRefs,
    viewState: BooksViewState,
): void {
    const STATE = viewState;
    STATE.titleFilter = "";
    STATE.shelfFilter = SHELF_FILTER_ALL;
    STATE.statusFilter = BOOK_STATUS_FILTER_ALL;
    if (refs.titleFilterInput) {
        refs.titleFilterInput.value = "";
    }
}
