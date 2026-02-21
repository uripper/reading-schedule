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

export function updateSortDirectionButton(
  sortDirectionBtn: HTMLButtonElement,
  sortDirection: SortDirection,
): void {
  sortDirectionBtn.textContent = "Ascending";
  if (sortDirection === SORT_DIRECTION_DESC) {
    sortDirectionBtn.textContent = "Descending";
  }
}

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
