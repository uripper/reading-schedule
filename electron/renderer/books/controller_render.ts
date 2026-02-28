import type { RenderBooksControllerArgs } from "../../types/types.js";
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
	const onEstimatedFinishNavigate = (dateKey: string): void => {
		args.onEstimatedFinishNavigate(dateKey);
	};
	const renderRefs = resolveRenderableRefs(args.refs);
	if (!renderRefs) {
		return;
	}

	const nextViewState = viewState;
	nextViewState.shelfFilter = updateShelfFilterOptions(
		renderRefs.shelfFilterSelect,
		args.books,
		nextViewState.shelfFilter,
	);
	nextViewState.statusFilter = updateStatusFilterOptions(
		renderRefs.statusFilterSelect,
		nextViewState.statusFilter,
	);
	nextViewState.groupBy = updateGroupByOptions(
		renderRefs.groupBySelect,
		nextViewState.groupBy,
		nextViewState.shelfFilter,
	);
	updateSortDirectionButton(
		renderRefs.sortDirectionBtn,
		nextViewState.sortDirection,
	);

	const settings = collectSettings();
	const showWordCount = settingBoolean(settings.books_show_word_count, true);
	const showBlockerMeta = settingBoolean(
		settings.books_show_blocker_meta,
		true,
	);
	const showShelfSetting = settingBoolean(settings.books_show_shelf_meta, true);
	const showShelfMeta =
		showShelfSetting && nextViewState.shelfFilter === SHELF_FILTER_ALL;
	const finishDateByBookId = finishDatesByBookId(args.scheduleRows, args.books);
	const visibleBooks = visibleBooksForView(
		args.books,
		nextViewState,
		finishDateByBookId,
	);

	let groups = groupBooks(
		visibleBooks,
		nextViewState.groupBy,
		finishDateByBookId,
	);
	if (
		nextViewState.sortBy === SORT_BY_ESTIMATED_FINISH &&
		nextViewState.groupBy === GROUP_BY_NONE
	) {
		groups = groupsForEstimatedFinish(visibleBooks);
	}
	renderBookGrid({
		groups,
		finishDateByBookId,
		onEstimatedFinishNavigate,
		showBlockerMeta,
		showShelfMeta,
		showWordCount,
		books: visibleBooks,
		allBooks: args.books,
		grid: renderRefs.grid,
		empty: renderRefs.empty,
		onEdit: (bookId) => {
			const book = args.findBook(bookId);
			if (book && args.dialog) {
				args.dialog.open(book);
			}
		},
		onRemove: (bookId) => {
			const nextBooks = args.books.filter((book) => book.book_id !== bookId);
			if (nextBooks.length === args.books.length) {
				return;
			}
			args.setBooks(nextBooks);
			args.rerender();
			args.onBooksChanged();
		},
	});
}
