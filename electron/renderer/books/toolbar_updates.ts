import type {
	Book,
	BookGroupBy,
	BookStatusFilter,
	SortDirection,
} from "../../types/types.js";
import { GROUP_BY_NONE } from "./grouping.js";
import { SORT_DIRECTION_DESC } from "./sort.js";
import { normalizeStatusFilter, statusFilterOptions } from "./status.js";
import { createOption } from "./toolbar_dom.js";
import {
	groupOptionsForShelfFilter,
	shelfFilterOptions,
} from "./toolbar_options.js";

/**
 * Updates sort direction button label from current direction state.
 * @param sortDirectionBtn Sort direction toggle button.
 * @param sortDirection Active sort direction value.
 */
export function updateSortDirectionButton(
	sortDirectionBtn: HTMLButtonElement,
	sortDirection: SortDirection,
): void {
	const nextSortDirectionButton = sortDirectionBtn;
	nextSortDirectionButton.textContent = "Ascending";
	if (sortDirection === SORT_DIRECTION_DESC) {
		nextSortDirectionButton.textContent = "Descending";
	}
}

/**
 * Rebuilds shelf filter options and returns the selected normalized value.
 * @param shelfFilterSelect Shelf filter select element.
 * @param books Books used to derive shelf options.
 * @param selectedValue Previously selected shelf filter.
 * @returns Selected shelf filter after options refresh.
 */
export function updateShelfFilterOptions(
	shelfFilterSelect: HTMLSelectElement,
	books: Book[],
	selectedValue: string,
): string {
	const nextShelfFilterSelect = shelfFilterSelect;
	const options = shelfFilterOptions(books);
	nextShelfFilterSelect.replaceChildren(
		...options.map((option) => createOption(option.value, option.label)),
	);
	let nextValue = options[0].value;
	if (options.some((option) => option.value === selectedValue)) {
		nextValue = selectedValue;
	}
	nextShelfFilterSelect.value = nextValue;
	return nextValue;
}

/**
 * Rebuilds status filter options and returns selected normalized status filter.
 * @param statusFilterSelect Status filter select element.
 * @param selectedValue Previously selected status filter.
 * @returns Selected normalized status filter after options refresh.
 */
export function updateStatusFilterOptions(
	statusFilterSelect: HTMLSelectElement,
	selectedValue: string,
): BookStatusFilter {
	const nextStatusFilterSelect = statusFilterSelect;
	const options = statusFilterOptions();
	nextStatusFilterSelect.replaceChildren(
		...options.map((option) => createOption(option.value, option.label)),
	);
	const normalized = normalizeStatusFilter(selectedValue);
	const selected = options.find((option) => option.value === normalized);
	let nextValue: BookStatusFilter = options[0].value;
	if (selected) {
		nextValue = selected.value;
	}
	nextStatusFilterSelect.value = nextValue;
	return nextValue;
}

/**
 * Rebuilds group-by options and returns selected normalized grouping value.
 * @param groupBySelect Group-by select element.
 * @param selectedValue Previously selected group-by value.
 * @param shelfFilter Active shelf filter that affects group options.
 * @returns Selected normalized group-by value after options refresh.
 */
export function updateGroupByOptions(
	groupBySelect: HTMLSelectElement,
	selectedValue: BookGroupBy,
	shelfFilter: string,
): BookGroupBy {
	const nextGroupBySelect = groupBySelect;
	const options = groupOptionsForShelfFilter(shelfFilter);
	nextGroupBySelect.replaceChildren(
		...options.map((option) => createOption(option.value, option.label)),
	);
	let nextValue: BookGroupBy = GROUP_BY_NONE;
	if (options.some((option) => option.value === selectedValue)) {
		nextValue = selectedValue;
	}
	nextGroupBySelect.value = nextValue;
	return nextValue;
}
