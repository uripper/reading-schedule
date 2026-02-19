
import {
  GROUP_BY_AUTHOR,
  GROUP_BY_FINISH_DATE,
  GROUP_BY_NONE,
  GROUP_BY_SHELF,
  GROUP_BY_TITLE_LETTER,
} from './grouping.js';
import { SHELF_FILTER_ALL, SHELF_FILTER_UNSHELVED, uniqueShelves } from './shelf.js';
import { normalizeStatusFilter, statusFilterOptions, type BookStatusFilter } from './status.js';
import {
  SORT_BY_AUTHOR,
  SORT_BY_DEADLINE,
  SORT_BY_DIFFICULTY,
  SORT_BY_ESTIMATED_FINISH,
  SORT_BY_PAGES_READ,
  SORT_BY_PAGES_TOTAL,
  SORT_BY_PRIORITY,
  SORT_BY_PROGRESS,
  SORT_BY_SHELF,
  SORT_BY_TITLE,
  SORT_BY_WORDS_TOTAL,
  SORT_DIRECTION_DESC,
} from './sort.js';
import type { Book } from "./types.js";
import type { BookGroupBy } from './grouping.js';
import type { SortDirection } from './sort.js';

type OptionDefinition = {
  value: string;
  label: string;
};

const SORT_OPTIONS = [
  { value: SORT_BY_TITLE, label: 'Title' },
  { value: SORT_BY_AUTHOR, label: 'Author' },
  { value: SORT_BY_ESTIMATED_FINISH, label: 'Estimated Finish' },
  { value: SORT_BY_PAGES_TOTAL, label: 'Pages' },
  { value: SORT_BY_PAGES_READ, label: 'Pages Read' },
  { value: SORT_BY_WORDS_TOTAL, label: 'Words' },
  { value: SORT_BY_PROGRESS, label: 'Progress' },
  { value: SORT_BY_PRIORITY, label: 'Priority' },
  { value: SORT_BY_DIFFICULTY, label: 'Difficulty' },
  { value: SORT_BY_DEADLINE, label: 'Deadline' },
  { value: SORT_BY_SHELF, label: 'Shelf' },
];

const GROUP_OPTIONS_BASE = [
  { value: GROUP_BY_NONE, label: 'None' },
  { value: GROUP_BY_FINISH_DATE, label: 'Finish Date' },
  { value: GROUP_BY_TITLE_LETTER, label: 'Title Letter' },
  { value: GROUP_BY_AUTHOR, label: 'Author' },
];

const GROUP_OPTION_SHELF = { value: GROUP_BY_SHELF, label: 'Shelves' };

function createOption(value: string, label: string): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function createLabeledSelect(labelText: string, selectId: string, options: OptionDefinition[]) {
  const label = document.createElement('label');
  label.className = 'books-control';
  label.textContent = labelText;

  const select = document.createElement('select');
  select.id = selectId;
  select.className = 'books-control-select';
  options.forEach((option) => {
    select.append(createOption(option.value, option.label));
  });

  label.append(select);
  return { label, select };
}

function createControlsWrap(toolbar: HTMLElement): HTMLElement {
  const wrap = toolbar.querySelector<HTMLElement>('.books-controls');
  if (wrap instanceof HTMLElement) {
    return wrap;
  }

  const nextWrap = document.createElement('div');
  nextWrap.className = 'row wrap-row books-controls';
  toolbar.append(nextWrap);
  return nextWrap;
}

function groupOptionsForShelfFilter(shelfFilter: string): OptionDefinition[] {
  const options = [...GROUP_OPTIONS_BASE];
  if (shelfFilter === SHELF_FILTER_ALL) {
    options.splice(1, 0, GROUP_OPTION_SHELF);
  }
  return options;
}

export function ensureBooksToolbarControls(toolbar: HTMLElement) {
  const wrap = createControlsWrap(toolbar);
  const shelf = createLabeledSelect('Shelf', 'booksShelfFilterSelect', []);
  const status = createLabeledSelect('Status', 'booksStatusFilterSelect', []);
  const sortBy = createLabeledSelect('Sort', 'booksSortBySelect', SORT_OPTIONS);
  const groupBy = createLabeledSelect('Group By', 'booksGroupBySelect', GROUP_OPTIONS_BASE);

  const sortDirectionBtn = document.createElement('button');
  sortDirectionBtn.type = 'button';
  sortDirectionBtn.className = 'btn';
  sortDirectionBtn.id = 'booksSortDirectionBtn';

  wrap.replaceChildren(shelf.label, status.label, sortBy.label, groupBy.label, sortDirectionBtn);
  return {
    shelfFilterSelect: shelf.select,
    statusFilterSelect: status.select,
    sortBySelect: sortBy.select,
    groupBySelect: groupBy.select,
    sortDirectionBtn,
  };
}

export function updateSortDirectionButton(sortDirectionBtn: HTMLButtonElement, sortDirection: SortDirection): void {
  sortDirectionBtn.textContent = 'Ascending';
  if (sortDirection === SORT_DIRECTION_DESC) {
    sortDirectionBtn.textContent = 'Descending';
  }
}

export function updateShelfFilterOptions(
  shelfFilterSelect: HTMLSelectElement,
  books: Book[],
  selectedValue: string,
): string {
  const shelfOptions: OptionDefinition[] = [{ value: SHELF_FILTER_ALL, label: 'All Shelves' }];
  shelfOptions.push({ value: SHELF_FILTER_UNSHELVED, label: 'Unshelved' });
  uniqueShelves(books).forEach((shelfName) => {
    shelfOptions.push({ value: shelfName, label: shelfName });
  });

  shelfFilterSelect.replaceChildren(...shelfOptions.map((option) => createOption(option.value, option.label)));

  let nextValue = SHELF_FILTER_ALL;
  const hasSelectedValue = shelfOptions.some((option) => option.value === selectedValue);
  if (hasSelectedValue) {
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
  statusFilterSelect.replaceChildren(...options.map((option) => createOption(option.value, option.label)));

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
  groupBySelect.replaceChildren(...options.map((option) => createOption(option.value, option.label)));

  let nextValue: BookGroupBy = GROUP_BY_NONE;
  const hasSelectedValue = options.some((option) => option.value === selectedValue);
  if (hasSelectedValue) {
    nextValue = selectedValue;
  }
  groupBySelect.value = nextValue;
  return nextValue;
}

export { GROUP_BY_NONE, GROUP_BY_SHELF } from './grouping.js';
export { SORT_BY_TITLE, SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from './sort.js';
