import {
    type Book,
    type BookGroupBy,
    type BookStatusFilter,
    type SortDirection,
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
    const NEXT_SORT_DIRECTION_BUTTON = sortDirectionBtn;
    NEXT_SORT_DIRECTION_BUTTON.textContent = "Ascending";
    if (sortDirection === SORT_DIRECTION_DESC) {
        NEXT_SORT_DIRECTION_BUTTON.textContent = "Descending";
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
    const NEXT_SHELF_FILTER_SELECT = shelfFilterSelect;
    const OPTIONS = shelfFilterOptions(books);
    NEXT_SHELF_FILTER_SELECT.replaceChildren(
        ...OPTIONS.map((option) => createOption(option.value, option.label)),
    );
    let nextValue = OPTIONS[0].value;
    if (OPTIONS.some((option) => option.value === selectedValue)) {
        nextValue = selectedValue;
    }
    NEXT_SHELF_FILTER_SELECT.value = nextValue;
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
    const NEXT_STATUS_FILTER_SELECT = statusFilterSelect;
    const OPTIONS = statusFilterOptions();
    NEXT_STATUS_FILTER_SELECT.replaceChildren(
        ...OPTIONS.map((option) => createOption(option.value, option.label)),
    );
    const NORMALIZED = normalizeStatusFilter(selectedValue);
    const SELECTED = OPTIONS.find((option) => option.value === NORMALIZED);
    let nextValue: BookStatusFilter = OPTIONS[0].value;
    if (SELECTED) {
        nextValue = SELECTED.value;
    }
    NEXT_STATUS_FILTER_SELECT.value = nextValue;
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
    const NEXT_GROUP_BY_SELECT = groupBySelect;
    const OPTIONS = groupOptionsForShelfFilter(shelfFilter);
    NEXT_GROUP_BY_SELECT.replaceChildren(
        ...OPTIONS.map((option) => createOption(option.value, option.label)),
    );
    let nextValue: BookGroupBy = GROUP_BY_NONE;
    if (OPTIONS.some((option) => option.value === selectedValue)) {
        nextValue = selectedValue;
    }
    NEXT_GROUP_BY_SELECT.value = nextValue;
    return nextValue;
}
