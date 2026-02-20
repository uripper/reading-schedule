import { normalizeStatusFilter } from './status.js';
import type { SortDirection } from './sort.js';
import { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from './toolbar.js';
import { toGroupBy, toSortBy, type BooksControllerRefs, type BooksViewState } from './controller_types.js';

function assertToolbarControls(refs: BooksControllerRefs): {
  sortBySelect: HTMLSelectElement;
  shelfFilterSelect: HTMLSelectElement;
  statusFilterSelect: HTMLSelectElement;
  groupBySelect: HTMLSelectElement;
  sortDirectionBtn: HTMLButtonElement;
} {
  if (!(refs.sortBySelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar sort-by control is missing or invalid.');
  }
  if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar shelf-filter control is missing or invalid.');
  }
  if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar status-filter control is missing or invalid.');
  }
  if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
    throw new TypeError('Books toolbar group-by control is missing or invalid.');
  }
  if (!(refs.sortDirectionBtn instanceof HTMLButtonElement)) {
    throw new TypeError('Books toolbar sort-direction control is missing or invalid.');
  }

  return {
    sortBySelect: refs.sortBySelect,
    shelfFilterSelect: refs.shelfFilterSelect,
    statusFilterSelect: refs.statusFilterSelect,
    groupBySelect: refs.groupBySelect,
    sortDirectionBtn: refs.sortDirectionBtn,
  };
}

type BindToolbarEventsArgs = {
  refs: BooksControllerRefs;
  viewState: BooksViewState;
  rerender: () => void;
};

export function bindToolbarEvents({ refs, viewState, rerender }: BindToolbarEventsArgs): void {
  const {
    sortBySelect,
    shelfFilterSelect,
    statusFilterSelect,
    groupBySelect,
    sortDirectionBtn,
  } = assertToolbarControls(refs);

  sortBySelect.addEventListener('change', () => {
    viewState.sortBy = toSortBy(sortBySelect.value);
    rerender();
  });

  shelfFilterSelect.addEventListener('change', () => {
    viewState.shelfFilter = shelfFilterSelect.value;
    rerender();
  });

  statusFilterSelect.addEventListener('change', () => {
    viewState.statusFilter = normalizeStatusFilter(statusFilterSelect.value);
    rerender();
  });

  groupBySelect.addEventListener('change', () => {
    viewState.groupBy = toGroupBy(groupBySelect.value);
    rerender();
  });

  sortDirectionBtn.addEventListener('click', () => {
    let nextDirection: SortDirection = SORT_DIRECTION_ASC;
    if (viewState.sortDirection === SORT_DIRECTION_ASC) {
      nextDirection = SORT_DIRECTION_DESC;
    }
    viewState.sortDirection = nextDirection;
    rerender();
  });
}
