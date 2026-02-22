import { normalizeStatusFilter } from "./status.js";
import type { SortDirection } from "./sort.js";
import { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "./toolbar.js";
import {
  toGroupBy,
  toSortBy,
  type BooksControllerRefs,
  type BooksViewState,
} from "./controller_types.js";

/**
 * Validates and unwraps toolbar control references required for event binding.
 * @param refs Controller DOM references collected during books UI setup.
 * @returns Strongly typed toolbar controls ready for listener registration.
 * @throws {TypeError} Thrown when any required toolbar control is missing.
 */
function assertToolbarControls(refs: BooksControllerRefs): {
  sortBySelect: HTMLSelectElement;
  shelfFilterSelect: HTMLSelectElement;
  statusFilterSelect: HTMLSelectElement;
  groupBySelect: HTMLSelectElement;
  sortDirectionBtn: HTMLButtonElement;
} {
  if (!(refs.sortBySelect instanceof HTMLSelectElement)) {
    throw new TypeError("Books toolbar sort-by control is missing or invalid.");
  }
  if (!(refs.shelfFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError(
      "Books toolbar shelf-filter control is missing or invalid.",
    );
  }
  if (!(refs.statusFilterSelect instanceof HTMLSelectElement)) {
    throw new TypeError(
      "Books toolbar status-filter control is missing or invalid.",
    );
  }
  if (!(refs.groupBySelect instanceof HTMLSelectElement)) {
    throw new TypeError(
      "Books toolbar group-by control is missing or invalid.",
    );
  }
  if (!(refs.sortDirectionBtn instanceof HTMLButtonElement)) {
    throw new TypeError(
      "Books toolbar sort-direction control is missing or invalid.",
    );
  }

  return {
    sortBySelect: refs.sortBySelect,
    shelfFilterSelect: refs.shelfFilterSelect,
    statusFilterSelect: refs.statusFilterSelect,
    groupBySelect: refs.groupBySelect,
    sortDirectionBtn: refs.sortDirectionBtn,
  };
}

interface BindToolbarEventsArgs {
  refs: BooksControllerRefs;
  viewState: BooksViewState;
  rerender(): void;
}

/**
 * Attaches toolbar listeners and synchronizes control changes into view state.
 * @param root0 Event binding inputs.
 * @param root0.refs Controller DOM references for toolbar controls.
 * @param root0.viewState Mutable view state driving books rendering.
 * @param root0.rerender Callback that refreshes the books view.
 */
export function bindToolbarEvents({
  refs,
  viewState,
  rerender,
}: BindToolbarEventsArgs): void {
  const {
    sortBySelect,
    shelfFilterSelect,
    statusFilterSelect,
    groupBySelect,
    sortDirectionBtn,
  } = assertToolbarControls(refs);

  sortBySelect.addEventListener("change", () => {
    viewState.sortBy = toSortBy(sortBySelect.value);
    rerender();
  });

  shelfFilterSelect.addEventListener("change", () => {
    viewState.shelfFilter = shelfFilterSelect.value;
    rerender();
  });

  statusFilterSelect.addEventListener("change", () => {
    viewState.statusFilter = normalizeStatusFilter(statusFilterSelect.value);
    rerender();
  });

  groupBySelect.addEventListener("change", () => {
    viewState.groupBy = toGroupBy(groupBySelect.value);
    rerender();
  });

  sortDirectionBtn.addEventListener("click", () => {
    let nextDirection: SortDirection = SORT_DIRECTION_ASC;
    if (viewState.sortDirection === SORT_DIRECTION_ASC) {
      nextDirection = SORT_DIRECTION_DESC;
    }
    viewState.sortDirection = nextDirection;
    rerender();
  });
}
