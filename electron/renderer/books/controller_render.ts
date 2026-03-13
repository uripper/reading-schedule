import type {
    Book,
    BookGroup,
    BooksViewState,
    RenderableBooksRefs,
    RenderBookGridOptions,
    RenderBooksControllerArgs,
} from "../../types/types.js";
import { collectSettings } from "../settings.js";
import { renderBookGrid } from "./card_view.js";
import {
    resolveRenderableRefs,
    visibleBooksForView,
} from "./controller_render_helpers.js";
import { groupsForEstimatedFinish } from "./estimated_finish_groups.js";
import { finishDatesByBookId } from "./finish_dates.js";
import { GROUP_BY_NONE, groupBooks } from "./grouping.js";
import { SHELF_FILTER_ALL } from "./shelf.js";
import { SORT_BY_ESTIMATED_FINISH } from "./sort.js";
import {
    updateGroupByOptions,
    updateShelfFilterOptions,
    updateSortDirectionButton,
    updateStatusFilterOptions,
} from "./toolbar.js";

/**
 * Normalizes a settings value to boolean with a fallback.
 * @param value - Raw setting value.
 * @param fallback - Default value when not explicitly boolean.
 * @returns Boolean display toggle value.
 */
function settingBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") {
        return value;
    }
    return fallback;
}

/**
 * Renders toolbar-driven books content and wires row-level edit/remove actions.
 * @param args - Render inputs for books controller view.
 * @param refs - Controller DOM references required for rendering.
 * @param books - Full in-memory book list.
 * @param scheduleRows - Planner schedule rows used for finish-date metadata.
 * @param viewState - Active shelf/status/sort/group options.
 * @param dialog - Edit dialog controller when available.
 * @param onBooksChanged - Callback fired when collection mutations occur.
 * @param onEstimatedFinishNavigate - Navigates to the selected finish date.
 * @param setBooks - State updater used after remove operations.
 * @param findBook - Lookup helper used before opening edit dialog.
 * @param rerender - Callback to refresh the books view after state updates.
 */
/**
 * Updates all filter and sort options based on current view state.
 */
function updateBooksViewFilters(
    refs: RenderableBooksRefs,
    books: Book[],
    viewState: BooksViewState,
): void {
    viewState.shelfFilter = updateShelfFilterOptions(
        refs.shelfFilterSelect,
        books,
        viewState.shelfFilter,
    );
    viewState.statusFilter = updateStatusFilterOptions(
        refs.statusFilterSelect,
        viewState.statusFilter,
    );
    viewState.groupBy = updateGroupByOptions(
        refs.groupBySelect,
        viewState.groupBy,
        viewState.shelfFilter,
    );
    updateSortDirectionButton(refs.sortDirectionBtn, viewState.sortDirection);
}

/**
 * Builds arguments for book grid rendering with handlers.
 */
interface RenderBookGridParams {
    finishDateByBookId: Record<string, string>;
    groups: BookGroup[];
    showBlockerMeta: boolean;
    showShelfMeta: boolean;
    showWordCount: boolean;
    visibleBooks: Book[];
}

/**
 * Builds the options object used to render the book grid from controller args and grid params; throws if required DOM refs are missing.
 * @example
 * buildRenderBookGridArgs(controllerArgs, gridParams)
 * { allBooks: [...], books: [...], empty: HTMLElement, grid: HTMLElement, onEdit: f, onRemove: f, onEstimatedFinishNavigate: f, ... }
 * @param {{RenderBooksControllerArgs}} {{args}} - Controller state, DOM references, book list and utility callbacks.
 * @param {{RenderBookGridParams}} {{params}} - Visible books, grouping and display flags for the grid.
 * @returns {{RenderBookGridOptions}} Return object with DOM refs, book lists, display flags and callback handlers for the grid.
 **/
function buildRenderBookGridArgs(
    args: RenderBooksControllerArgs,
    params: RenderBookGridParams,
): RenderBookGridOptions {
    if (!args.refs.empty || !args.refs.grid) {
        throw new Error("Missing required DOM references");
    }
    return {
        allBooks: args.books,
        books: params.visibleBooks,
        empty: args.refs.empty,
        finishDateByBookId: params.finishDateByBookId,
        grid: args.refs.grid,
        groups: params.groups,
        onEdit: (bookId: string): void => {
            const BOOK = args.findBook(bookId);
            if (BOOK && args.dialog) {
                args.dialog.open(BOOK);
            }
        },
        onEstimatedFinishNavigate: (dateKey: string): void => {
            args.onEstimatedFinishNavigate(dateKey);
        },
        onRemove: (bookId: string): void => {
            const NEXT_BOOKS = args.books.filter(
                (book) => book.book_id !== bookId,
            );
            if (NEXT_BOOKS.length === args.books.length) {
                return;
            }
            args.setBooks(NEXT_BOOKS);
            args.rerender();
            args.onBooksChanged();
        },
        showBlockerMeta: params.showBlockerMeta,
        showShelfMeta: params.showShelfMeta,
        showWordCount: params.showWordCount,
    };
}

/**
 * Render the books view by updating filters, generating view settings, and rendering the book grid.
 * @example
 * renderBooksController({ refs: someRefs, books: booksArray, viewState: currentViewState })
 * undefined
 * @param {RenderBooksControllerArgs} args - Arguments including refs, books, and viewState used to compute rendering.
 * @returns {void} Nothing; performs UI updates to render the book grid.
 **/
export function renderBooksController(args: RenderBooksControllerArgs): void {
    const { viewState } = args;
    const RENDER_REFS = resolveRenderableRefs(args.refs);
    if (!RENDER_REFS) {
        return;
    }

    updateBooksViewFilters(RENDER_REFS, args.books, viewState);

    let {
        groups,
        visibleBooks,
        finishDateByBookId,
        showBlockerMeta,
        showShelfMeta,
        showWordCount,
    } = generateBookViewSettings(viewState, args);
    if (
        viewState.sortBy === SORT_BY_ESTIMATED_FINISH &&
        viewState.groupBy === GROUP_BY_NONE
    ) {
        groups = groupsForEstimatedFinish(visibleBooks);
    }
    const GRID_ARGS = buildRenderBookGridArgs(args, {
        finishDateByBookId,
        groups,
        showBlockerMeta,
        showShelfMeta,
        showWordCount,
        visibleBooks,
    });
    renderBookGrid(GRID_ARGS);
}

/**
 * Derives book view settings and content based on active toolbar options and
 * @param nextViewState - Current shelf/status/sort/group options used for rendering.
 * @param args - Render inputs for books controller view.
 * @returns An object containing the settings for rendering the book view.
 */
function generateBookViewSettings(
    nextViewState: BooksViewState,
    args: RenderBooksControllerArgs,
) {
    const SETTINGS = collectSettings();
    const SHOW_WORD_COUNT = settingBoolean(
        SETTINGS.books_show_word_count,
        true,
    );
    const SHOW_BLOCKER_META = settingBoolean(
        SETTINGS.books_show_blocker_meta,
        true,
    );
    const SHOW_SHELF_SETTING = settingBoolean(
        SETTINGS.books_show_shelf_meta,
        true,
    );
    const SHOW_SHELF_META =
        SHOW_SHELF_SETTING && nextViewState.shelfFilter === SHELF_FILTER_ALL;
    const FINISH_DATE_BY_BOOK_ID = finishDatesByBookId(
        args.scheduleRows,
        args.books,
    );
    const VISIBLE_BOOKS = visibleBooksForView(
        args.books,
        nextViewState,
        FINISH_DATE_BY_BOOK_ID,
    );

    const GROUPS = groupBooks(
        VISIBLE_BOOKS,
        nextViewState.groupBy,
        FINISH_DATE_BY_BOOK_ID,
    );
    return {
        finishDateByBookId: FINISH_DATE_BY_BOOK_ID,
        groups: GROUPS,
        showBlockerMeta: SHOW_BLOCKER_META,
        showShelfMeta: SHOW_SHELF_META,
        showWordCount: SHOW_WORD_COUNT,
        visibleBooks: VISIBLE_BOOKS,
    };
}
