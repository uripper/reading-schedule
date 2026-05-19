import { logError } from "../../types/logger.ts";
import type {
    Book,
    BookGroup,
    BooksViewState,
    RenderableBooksRefs,
    RenderBookGridOptions,
    RenderBooksControllerArgs,
} from "../../types/types.ts";
import { collectSettings } from "../settings.ts";
import { booksAfterRemovingBook } from "./blocker-lineage.ts";
import { renderBookGrid } from "./card_view.ts";
import {
    resolveRenderableRefs,
    visibleBooksForView,
} from "./controller_render_helpers.ts";
import { groupsForEstimatedFinish } from "./estimated_finish_groups.ts";
import { finishDatesByBookId } from "./finish-dates.ts";
import { GROUP_BY_NONE, groupBooks } from "./grouping.ts";
import { confirmRemoveBook } from "./remove-confirm.ts";
import { SHELF_FILTER_ALL } from "./shelf.ts";
import { SORT_BY_ESTIMATED_FINISH } from "./sort.ts";
import { BOOK_STATUS_FILTER_ALL } from "./status_catalog.ts";
import {
    updateGroupByOptions,
    updateShelfFilterOptions,
    updateSortBySelection,
    updateSortDirectionButton,
    updateStatusFilterOptions,
} from "./toolbar.ts";

function settingBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    return fallback;
}

function updateBooksViewFilters(
    refs: RenderableBooksRefs,
    books: Book[],
    viewState: BooksViewState,
): void {
    const NEXT_VIEW_STATE = viewState;
    NEXT_VIEW_STATE.shelfFilter = updateShelfFilterOptions(
        refs.shelfFilterSelect,
        books,
        viewState.shelfFilter,
    );
    NEXT_VIEW_STATE.statusFilter = updateStatusFilterOptions(
        refs.statusFilterSelect,
        NEXT_VIEW_STATE.statusFilter,
    );
    NEXT_VIEW_STATE.groupBy = updateGroupByOptions(
        refs.groupBySelect,
        NEXT_VIEW_STATE.groupBy,
        NEXT_VIEW_STATE.shelfFilter,
    );
    updateSortBySelection(refs.sortBySelect, NEXT_VIEW_STATE.sortBy);
    updateSortDirectionButton(
        refs.sortDirectionBtn,
        NEXT_VIEW_STATE.sortDirection,
    );
}

interface RenderBookGridParams {
    finishDateByBookId: Record<string, string>;
    groups: BookGroup[];
    showBlockerMeta: boolean;
    showShelfMeta: boolean;
    showWordCount: boolean;
    visibleBooks: Book[];
}

function requiredGridRefs(
    refs: RenderBooksControllerArgs["refs"],
): Pick<RenderBookGridOptions, "empty" | "grid"> {
    if (!(refs.empty && refs.grid)) {
        throw new Error("Missing required DOM references");
    }
    return {
        empty: refs.empty,
        grid: refs.grid,
    };
}

function createEditHandler(
    args: RenderBooksControllerArgs,
): RenderBookGridOptions["onEdit"] {
    return (bookId: string): void => {
        const BOOK = args.findBook(bookId);
        if (BOOK && args.dialog) {
            args.dialog.open(BOOK);
        }
    };
}

function createRemoveHandler(
    args: RenderBooksControllerArgs,
): RenderBookGridOptions["onRemove"] {
    return (bookId: string): void => {
        const BOOK = args.findBook(bookId);
        if (BOOK === null) {
            return;
        }
        confirmRemoveBook(BOOK)
            .then((confirmed) => {
                if (!confirmed) {
                    return;
                }
                removeBookById(args, bookId);
            })
            .catch(reportRemoveBookConfirmError);
    };
}

function removeBookById(args: RenderBooksControllerArgs, bookId: string): void {
    const NEXT_BOOKS = booksAfterRemovingBook(args.books, bookId);
    if (NEXT_BOOKS.length === args.books.length) {
        return;
    }
    args.setBooks(NEXT_BOOKS);
    args.rerender();
    args.onBooksChanged();
}

function reportRemoveBookConfirmError(error: unknown): void {
    logError("Could not confirm book removal.", error);
}

function buildRenderBookGridArgs(
    args: RenderBooksControllerArgs,
    params: RenderBookGridParams,
): RenderBookGridOptions {
    return {
        allBooks: args.books,
        books: params.visibleBooks,
        empty: requiredGridRefs(args.refs).empty,
        finishDateByBookId: params.finishDateByBookId,
        grid: requiredGridRefs(args.refs).grid,
        groups: params.groups,
        onEdit: createEditHandler(args),
        onEstimatedFinishNavigate: args.onEstimatedFinishNavigate,
        onRemove: createRemoveHandler(args),
        showBlockerMeta: params.showBlockerMeta,
        showShelfMeta: params.showShelfMeta,
        showWordCount: params.showWordCount,
    };
}

function displayMetaSettings(
    nextViewState: BooksViewState,
): Pick<
    RenderBookGridParams,
    "showBlockerMeta" | "showShelfMeta" | "showWordCount"
> {
    const SETTINGS = collectSettings();
    const SHOW_SHELF_META = settingBoolean(
        SETTINGS.books_show_shelf_meta,
        true,
    );
    return {
        showBlockerMeta: settingBoolean(SETTINGS.books_show_blocker_meta, true),
        showShelfMeta:
            SHOW_SHELF_META && nextViewState.shelfFilter === SHELF_FILTER_ALL,
        showWordCount: settingBoolean(SETTINGS.books_show_word_count, true),
    };
}

function baseRenderGridParams(
    args: RenderBooksControllerArgs,
    viewState: BooksViewState,
): RenderBookGridParams {
    const FINISH_DATE_BY_BOOK_ID = finishDatesByBookId(
        args.scheduleRows,
        args.books,
    );
    const META_SETTINGS = displayMetaSettings(viewState);
    const VISIBLE_BOOKS = visibleBooksForView(
        args.books,
        viewState,
        FINISH_DATE_BY_BOOK_ID,
    );
    return {
        ...META_SETTINGS,
        finishDateByBookId: FINISH_DATE_BY_BOOK_ID,
        groups: groupBooks(
            VISIBLE_BOOKS,
            viewState.groupBy,
            FINISH_DATE_BY_BOOK_ID,
        ),
        visibleBooks: VISIBLE_BOOKS,
    };
}

function renderGridParams(
    args: RenderBooksControllerArgs,
    viewState: BooksViewState,
): RenderBookGridParams {
    const VIEW_SETTINGS = baseRenderGridParams(args, viewState);
    if (
        viewState.sortBy === SORT_BY_ESTIMATED_FINISH &&
        viewState.groupBy === GROUP_BY_NONE
    ) {
        return {
            ...VIEW_SETTINGS,
            groups: groupsForEstimatedFinish(VIEW_SETTINGS.visibleBooks),
        };
    }
    return VIEW_SETTINGS;
}

function hasActiveFilters(viewState: BooksViewState): boolean {
    if (viewState.titleFilter.trim() !== "") {
        return true;
    }
    if (viewState.shelfFilter !== SHELF_FILTER_ALL) {
        return true;
    }
    return viewState.statusFilter !== BOOK_STATUS_FILTER_ALL;
}

function resetBookFilters(args: RenderBooksControllerArgs): void {
    const NEXT_VIEW_STATE = args.viewState;
    NEXT_VIEW_STATE.titleFilter = "";
    NEXT_VIEW_STATE.shelfFilter = SHELF_FILTER_ALL;
    NEXT_VIEW_STATE.statusFilter = BOOK_STATUS_FILTER_ALL;
    if (args.refs.titleFilterInput) {
        args.refs.titleFilterInput.value = "";
    }
    args.rerender();
}

function renderFilteredEmptyState(args: RenderBooksControllerArgs): void {
    const EMPTY = args.refs.empty;
    if (!EMPTY) {
        return;
    }
    const MESSAGE = document.createElement("span");
    MESSAGE.textContent = "No books found with current filters.";
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "books-empty-clear";
    BUTTON.textContent = "Clear Filters";
    BUTTON.onclick = () => {
        resetBookFilters(args);
    };
    EMPTY.replaceChildren(MESSAGE, BUTTON);
}

function renderDefaultEmptyState(args: RenderBooksControllerArgs): void {
    const EMPTY = args.refs.empty;
    if (!EMPTY) {
        return;
    }
    EMPTY.textContent = "No books yet. Add your first book to start planning.";
}

function renderEmptyStateCopy(
    args: RenderBooksControllerArgs,
    params: RenderBookGridParams,
): void {
    if (params.visibleBooks.length > 0) {
        return;
    }
    if (args.books.length > 0 && hasActiveFilters(args.viewState)) {
        renderFilteredEmptyState(args);
        return;
    }
    renderDefaultEmptyState(args);
}

export function renderBooksController(args: RenderBooksControllerArgs): void {
    const { viewState } = args;
    const RENDER_REFS = resolveRenderableRefs(args.refs);
    if (!RENDER_REFS) {
        return;
    }
    updateBooksViewFilters(RENDER_REFS, args.books, viewState);
    const GRID_PARAMS = renderGridParams(args, viewState);
    renderBookGrid(buildRenderBookGridArgs(args, GRID_PARAMS));
    renderEmptyStateCopy(args, GRID_PARAMS);
}
