import { shelfFilterMatches } from "./shelf.js";
import { statusFilterMatches } from "./status.js";
import { sortBooks } from "./sort.js";
import type { Book } from "./types.js";
import type { BooksControllerRefs, BooksViewState } from "./controller_types.js";

export interface RenderableBooksRefs {
  shelfFilterSelect: HTMLSelectElement;
  groupBySelect: HTMLSelectElement;
  statusFilterSelect: HTMLSelectElement;
  sortDirectionBtn: HTMLButtonElement;
  grid: HTMLElement;
  empty: HTMLElement;
}

/**
 *
 * @param refs
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
  if (!(refs.grid instanceof HTMLElement) || !(refs.empty instanceof HTMLElement)) {
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
 *
 * @param books
 * @param viewState
 * @param finishDateByBookId
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
    if (!shelfFilterMatches(book, viewState.shelfFilter)) {
      return false;
    }
    return statusFilterMatches(book, viewState.statusFilter);
  });
}
