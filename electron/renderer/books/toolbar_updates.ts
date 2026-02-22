import { GROUP_BY_NONE, type BookGroupBy } from "./grouping.js";
import {
  normalizeStatusFilter,
  statusFilterOptions,
  type BookStatusFilter,
} from "./status.js";
import { SORT_DIRECTION_DESC, type SortDirection } from "./sort.js";
import type { Book } from "./types.js";
import { createOption } from "./toolbar_dom.js";
import { groupOptionsForShelfFilter, shelfFilterOptions } from "./toolbar_options.js";

/**
 * Updates sort direction button label from current direction state.
 * @param sortDirectionBtn Sort direction toggle button.
 * @param sortDirection Active sort direction value.
 */
export function updateSortDirectionButton(
  sortDirectionBtn: HTMLButtonElement,
  sortDirection: SortDirection,
): void {
  sortDirectionBtn.textContent = "Ascending";
  if (sortDirection === SORT_DIRECTION_DESC) {
    sortDirectionBtn.textContent = "Descending";
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
  const options = shelfFilterOptions(books);
  shelfFilterSelect.replaceChildren(
    ...options.map((option) => createOption(option.value, option.label)),
  );
  let nextValue = options[0].value;
  if (options.some((option) => option.value === selectedValue)) {
    nextValue = selectedValue;
  }
  shelfFilterSelect.value = nextValue;
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
  const options = statusFilterOptions();
  statusFilterSelect.replaceChildren(
    ...options.map((option) => createOption(option.value, option.label)),
  );
  const normalized = normalizeStatusFilter(selectedValue);
  const selected = options.find((option) => option.value === normalized);
  let nextValue: BookStatusFilter = options[0].value;
  if (selected) {
    nextValue = selected.value;
  }
  statusFilterSelect.value = nextValue;
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
  const options = groupOptionsForShelfFilter(shelfFilter);
  groupBySelect.replaceChildren(
    ...options.map((option) => createOption(option.value, option.label)),
  );
  let nextValue: BookGroupBy = GROUP_BY_NONE;
  if (options.some((option) => option.value === selectedValue)) {
    nextValue = selectedValue;
  }
  groupBySelect.value = nextValue;
  return nextValue;
}
