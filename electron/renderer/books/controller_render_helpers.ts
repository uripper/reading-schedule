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
