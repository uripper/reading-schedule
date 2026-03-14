import type {
    Book,
    BookGroup,
    BooksViewState,
    RenderableBooksRefs,
    RenderBookGridOptions,
    RenderBooksControllerArgs,
} from "../../types/types.ts";
import { collectSettings } from "../settings.ts";
import { renderBookGrid } from "./card_view.ts";
import {
    resolveRenderableRefs,
    visibleBooksForView,
} from "./controller_render_helpers.ts";
import { groupsForEstimatedFinish } from "./estimated_finish_groups.ts";
import { finishDatesByBookId } from "./finish-dates.ts";
import { GROUP_BY_NONE, groupBooks } from "./grouping.ts";
import { SHELF_FILTER_ALL } from "./shelf.ts";
import { SORT_BY_ESTIMATED_FINISH } from "./sort.ts";
import {
    updateGroupByOptions,
    updateShelfFilterOptions,
    updateSortDirectionButton,
    updateStatusFilterOptions,
} from "./toolbar.ts";

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
    const NEXT_VIEW_STATE = viewState;
    NEXT_VIEW_STATE.shelfFilter = updateShelfFilter(refs, books, viewState);
    NEXT_VIEW_STATE.statusFilter = updateStatusFilter(refs, NEXT_VIEW_STATE);
    NEXT_VIEW_STATE.groupBy = updateGroupBy(refs, NEXT_VIEW_STATE);
    updateSortDirectionButton(
        refs.sortDirectionBtn,
        NEXT_VIEW_STATE.sortDirection,
    );
}

function updateShelfFilter(
    refs: RenderableBooksRefs,
    books: Book[],
    viewState: BooksViewState,
): string {
    return updateShelfFilterOptions(
        refs.shelfFilterSelect,
        books,
        viewState.shelfFilter,
    );
}

function updateStatusFilter(
    refs: RenderableBooksRefs,
    viewState: BooksViewState,
): string {
    return updateStatusFilterOptions(
        refs.statusFilterSelect,
        viewState.statusFilter,
    );
}

function updateGroupBy(
    refs: RenderableBooksRefs,
    viewState: BooksViewState,
): string {
    return updateGroupByOptions(
        refs.groupBySelect,
        viewState.groupBy,
        viewState.shelfFilter,
    );
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

function createNavigateHandler(
    args: RenderBooksControllerArgs,
): RenderBookGridOptions["onEstimatedFinishNavigate"] {
    return (dateKey: string): void => {
        args.onEstimatedFinishNavigate(dateKey);
    };
}

function createRemoveHandler(
    args: RenderBooksControllerArgs,
): RenderBookGridOptions["onRemove"] {
    return (bookId: string): void => {
        const NEXT_BOOKS = args.books.filter((book) => book.book_id !== bookId);
        if (NEXT_BOOKS.length === args.books.length) {
            return;
        }
        args.setBooks(NEXT_BOOKS);
        args.rerender();
        args.onBooksChanged();
    };
}

function baseRenderBookGridArgs(
    args: RenderBooksControllerArgs,
    params: RenderBookGridParams,
): Omit<
    RenderBookGridOptions,
    "empty" | "grid" | "onEdit" | "onEstimatedFinishNavigate" | "onRemove"
> {
    return {
        allBooks: args.books,
        books: params.visibleBooks,
        finishDateByBookId: params.finishDateByBookId,
        groups: params.groups,
        showBlockerMeta: params.showBlockerMeta,
        showShelfMeta: params.showShelfMeta,
        showWordCount: params.showWordCount,
    };
}

/**
 * Builds the options object used to render the book grid from controller args and grid params; throws if required DOM refs are missing.
 * @example
 * buildRenderBookGridArgs(controllerArgs, gridParams)
 * { allBooks: [...], books: [...], empty: HTMLElement, grid: HTMLElement, onEdit: f, onRemove: f, onEstimatedFinishNavigate: f, ... }
 * @param args - Controller state, DOM references, book list and utility callbacks.
 * @param params - Visible books, grouping and display flags for the grid.
 * @returns Return object with DOM refs, book lists, display flags and callback handlers for the grid.
 **/
function buildRenderBookGridArgs(
    args: RenderBooksControllerArgs,
    params: RenderBookGridParams,
): RenderBookGridOptions {
    return {
        ...baseRenderBookGridArgs(args, params),
        ...requiredGridRefs(args.refs),
        onEdit: createEditHandler(args),
        onEstimatedFinishNavigate: createNavigateHandler(args),
        onRemove: createRemoveHandler(args),
    };
}

interface BookViewSettings {
    finishDateByBookId: Record<string, string>;
    groups: BookGroup[];
    showBlockerMeta: boolean;
    showShelfMeta: boolean;
    showWordCount: boolean;
    visibleBooks: Book[];
}

function displayMetaSettings(
    nextViewState: BooksViewState,
): Pick<
    BookViewSettings,
    "showBlockerMeta" | "showShelfMeta" | "showWordCount"
> {
    return {
        showBlockerMeta: showBlockerMetaSetting(),
        showShelfMeta: showShelfMetaSetting(nextViewState),
        showWordCount: showWordCountSetting(),
    };
}

function booksViewSettings() {
    return collectSettings();
}

function showWordCountSetting(): boolean {
    return settingBoolean(booksViewSettings().books_show_word_count, true);
}

function showBlockerMetaSetting(): boolean {
    return settingBoolean(booksViewSettings().books_show_blocker_meta, true);
}

function showShelfMetaSetting(nextViewState: BooksViewState): boolean {
    if (!settingBoolean(booksViewSettings().books_show_shelf_meta, true)) {
        return false;
    }
    return nextViewState.shelfFilter === SHELF_FILTER_ALL;
}

function finishDateByBook(
    args: RenderBooksControllerArgs,
): Record<string, string> {
    return finishDatesByBookId(args.scheduleRows, args.books);
}

function visibleBooksContext(
    args: RenderBooksControllerArgs,
    nextViewState: BooksViewState,
    finishDateByBookId: Record<string, string>,
): Book[] {
    return visibleBooksForView(args.books, nextViewState, finishDateByBookId);
}

function visibleBooksForGrouping(options: VisibleBooksGroupingArgs): Book[] {
    return visibleBooksContext(
        options.args,
        options.nextViewState,
        options.finishDateByBookId,
    );
}

function groupsForGrouping(
    nextViewState: BooksViewState,
    visibleBooks: Book[],
    finishDateByBookId: Record<string, string>,
): BookGroup[] {
    return groupedVisibleBooks(nextViewState, visibleBooks, finishDateByBookId);
}

function groupedVisibleBooks(
    nextViewState: BooksViewState,
    visibleBooks: Book[],
    finishDateByBookId: Record<string, string>,
): BookGroup[] {
    return groupBooks(visibleBooks, nextViewState.groupBy, finishDateByBookId);
}

function finishDateContextResult(
    finishDateByBookId: Record<string, string>,
    groups: BookGroup[],
    visibleBooks: Book[],
): Pick<BookViewSettings, "finishDateByBookId" | "groups" | "visibleBooks"> {
    return {
        finishDateByBookId,
        groups,
        visibleBooks,
    };
}

interface VisibleBooksGroupingArgs {
    args: RenderBooksControllerArgs;
    finishDateByBookId: Record<string, string>;
    nextViewState: BooksViewState;
}

type VisibleBooksGrouping = Pick<BookViewSettings, "groups" | "visibleBooks">;

function visibleBooksGroupingResult(
    groups: BookGroup[],
    visibleBooks: Book[],
): VisibleBooksGrouping {
    return { groups, visibleBooks };
}

function booksGrouping(
    options: VisibleBooksGroupingArgs,
): VisibleBooksGrouping {
    const { finishDateByBookId, nextViewState } = options;
    const VISIBLE_BOOKS = visibleBooksForGrouping(options);
    const GROUPS = groupsForGrouping(
        nextViewState,
        VISIBLE_BOOKS,
        finishDateByBookId,
    );
    return visibleBooksGroupingResult(GROUPS, VISIBLE_BOOKS);
}

function finishDateContext(
    nextViewState: BooksViewState,
    args: RenderBooksControllerArgs,
): Pick<BookViewSettings, "finishDateByBookId" | "groups" | "visibleBooks"> {
    const FINISH_DATE_BY_BOOK_ID = finishDateByBook(args);
    const GROUPING = booksGrouping({
        args,
        finishDateByBookId: FINISH_DATE_BY_BOOK_ID,
        nextViewState,
    });
    return finishDateContextResult(
        FINISH_DATE_BY_BOOK_ID,
        GROUPING.groups,
        GROUPING.visibleBooks,
    );
}

function renderGridParams(
    args: RenderBooksControllerArgs,
    viewState: BooksViewState,
): RenderBookGridParams {
    const VIEW_SETTINGS = generateBookViewSettings(viewState, args);
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
    renderBookGrid(
        buildRenderBookGridArgs(args, renderGridParams(args, viewState)),
    );
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
): BookViewSettings {
    return {
        ...displayMetaSettings(nextViewState),
        ...finishDateContext(nextViewState, args),
    };
}
