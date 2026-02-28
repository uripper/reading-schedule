import type {
    BooksViewState,
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
 * @param value Raw setting value.
 * @param fallback Default value when not explicitly boolean.
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
 * @param args Render inputs for books controller view.
 * @param args.refs Controller DOM references required for rendering.
 * @param args.books Full in-memory book list.
 * @param args.scheduleRows Planner schedule rows used for finish-date metadata.
 * @param args.viewState Active shelf/status/sort/group options.
 * @param args.dialog Edit dialog controller when available.
 * @param args.onBooksChanged Callback fired when collection mutations occur.
 * @param args.onEstimatedFinishNavigate Navigates to the selected finish date.
 * @param args.setBooks State updater used after remove operations.
 * @param args.findBook Lookup helper used before opening edit dialog.
 * @param args.rerender Callback to refresh the books view after state updates.
 */
export function renderBooksController(args: RenderBooksControllerArgs): void {
    const { viewState } = args;
    const ON_ESTIMATED_FINISH_NAVIGATE = (dateKey: string): void => {
        args.onEstimatedFinishNavigate(dateKey);
    };
    const RENDER_REFS = resolveRenderableRefs(args.refs);
    if (!RENDER_REFS) {
        return;
    }

    const NEXT_VIEW_STATE = viewState;
    NEXT_VIEW_STATE.shelfFilter = updateShelfFilterOptions(
        RENDER_REFS.shelfFilterSelect,
        args.books,
        NEXT_VIEW_STATE.shelfFilter,
    );
    NEXT_VIEW_STATE.statusFilter = updateStatusFilterOptions(
        RENDER_REFS.statusFilterSelect,
        NEXT_VIEW_STATE.statusFilter,
    );
    NEXT_VIEW_STATE.groupBy = updateGroupByOptions(
        RENDER_REFS.groupBySelect,
        NEXT_VIEW_STATE.groupBy,
        NEXT_VIEW_STATE.shelfFilter,
    );
    updateSortDirectionButton(
        RENDER_REFS.sortDirectionBtn,
        NEXT_VIEW_STATE.sortDirection,
    );

    let {
        groups,
        visibleBooks,
        finishDateByBookId,
        showBlockerMeta,
        showShelfMeta,
        showWordCount,
    } = generateBookViewSettings(NEXT_VIEW_STATE, args);
    if (
        NEXT_VIEW_STATE.sortBy === SORT_BY_ESTIMATED_FINISH &&
        NEXT_VIEW_STATE.groupBy === GROUP_BY_NONE
    ) {
        groups = groupsForEstimatedFinish(visibleBooks);
    }
    renderBookGrid({
        allBooks: args.books,
        books: visibleBooks,
        empty: RENDER_REFS.empty,
        finishDateByBookId,
        grid: RENDER_REFS.grid,
        groups,
        onEdit: (bookId) => {
            const BOOK = args.findBook(bookId);
            if (BOOK && args.dialog) {
                args.dialog.open(BOOK);
            }
        },
        onEstimatedFinishNavigate: ON_ESTIMATED_FINISH_NAVIGATE,
        onRemove: (bookId) => {
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
        showBlockerMeta,
        showShelfMeta,
        showWordCount,
    });
}

/**
 * Derives book view settings and content based on active toolbar options and
 * @param nextViewState Current shelf/status/sort/group options used for rendering.
 * @param args Render inputs for books controller view.
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
