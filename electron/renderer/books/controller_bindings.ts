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
 * @param args Event binding inputs.
 * @param args.refs Controller DOM references for toolbar controls.
 * @param args.viewState Mutable view state driving books rendering.
 * @param args.rerender Callback that refreshes the books view.
 */
export function bindToolbarEvents(args: BindToolbarEventsArgs): void {
  const nextViewState = args.viewState;
  const {
    sortBySelect,
    shelfFilterSelect,
    statusFilterSelect,
    groupBySelect,
    sortDirectionBtn,
  } = assertToolbarControls(args.refs);

  sortBySelect.addEventListener("change", () => {
    nextViewState.sortBy = toSortBy(sortBySelect.value);
    args.rerender();
  });

  shelfFilterSelect.addEventListener("change", () => {
    nextViewState.shelfFilter = shelfFilterSelect.value;
    args.rerender();
  });

  statusFilterSelect.addEventListener("change", () => {
    nextViewState.statusFilter = normalizeStatusFilter(statusFilterSelect.value);
    args.rerender();
  });

  groupBySelect.addEventListener("change", () => {
    nextViewState.groupBy = toGroupBy(groupBySelect.value);
    args.rerender();
  });

  sortDirectionBtn.addEventListener("click", () => {
    let nextDirection: SortDirection = SORT_DIRECTION_ASC;
    if (nextViewState.sortDirection === SORT_DIRECTION_ASC) {
      nextDirection = SORT_DIRECTION_DESC;
    }
    nextViewState.sortDirection = nextDirection;
    args.rerender();
  });
}
