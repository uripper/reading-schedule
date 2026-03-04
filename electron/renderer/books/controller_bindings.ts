import type {
    BindToolbarEventsArgs,
    BooksControllerRefs,
    SortDirection,
} from "../../types/types.js";
import { toGroupBy, toSortBy } from "./controller_types.js";
import { normalizeStatusFilter } from "./status.js";
import { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "./toolbar.js";

/**
 * Validates and unwraps toolbar control references required for event binding.
 * @param refs Controller DOM references collected during books UI setup.
 * @returns Strongly typed toolbar controls ready for listener registration.
 * @throws {TypeError} Thrown when any required toolbar control is missing.
 */
function assertToolbarControls(refs: BooksControllerRefs): {
    titleFilterInput: HTMLInputElement;
    sortBySelect: HTMLSelectElement;
    shelfFilterSelect: HTMLSelectElement;
    statusFilterSelect: HTMLSelectElement;
    groupBySelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
} {
    if (!(refs.titleFilterInput instanceof HTMLInputElement)) {
        throw new TypeError(
            "Books toolbar title-filter control is missing or invalid.",
        );
    }
    if (!(refs.sortBySelect instanceof HTMLSelectElement)) {
        throw new TypeError(
            "Books toolbar sort-by control is missing or invalid.",
        );
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
        groupBySelect: refs.groupBySelect,
        shelfFilterSelect: refs.shelfFilterSelect,
        sortBySelect: refs.sortBySelect,
        sortDirectionBtn: refs.sortDirectionBtn,
        statusFilterSelect: refs.statusFilterSelect,
        titleFilterInput: refs.titleFilterInput,
    };
}

/**
 * Attaches toolbar listeners and synchronizes control changes into view state.
 * @param args Event binding inputs.
 * @param args.refs Controller DOM references for toolbar controls.
 * @param args.viewState Mutable view state driving books rendering.
 * @param args.rerender Callback that refreshes the books view.
 */
export function bindToolbarEvents(args: BindToolbarEventsArgs): void {
    const NEXT_VIEW_STATE = args.viewState;
    const {
        titleFilterInput,
        sortBySelect,
        shelfFilterSelect,
        statusFilterSelect,
        groupBySelect,
        sortDirectionBtn,
    } = assertToolbarControls(args.refs);

    const APPLY_TITLE_FILTER = (): void => {
        NEXT_VIEW_STATE.titleFilter = String(titleFilterInput.value || "");
        args.rerender();
    };
    titleFilterInput.addEventListener("input", APPLY_TITLE_FILTER);
    titleFilterInput.addEventListener("change", APPLY_TITLE_FILTER);

    sortBySelect.addEventListener("change", () => {
        NEXT_VIEW_STATE.sortBy = toSortBy(sortBySelect.value);
        args.rerender();
    });

    shelfFilterSelect.addEventListener("change", () => {
        NEXT_VIEW_STATE.shelfFilter = shelfFilterSelect.value;
        args.rerender();
    });

    statusFilterSelect.addEventListener("change", () => {
        NEXT_VIEW_STATE.statusFilter = normalizeStatusFilter(
            statusFilterSelect.value,
        );
        args.rerender();
    });

    groupBySelect.addEventListener("change", () => {
        NEXT_VIEW_STATE.groupBy = toGroupBy(groupBySelect.value);
        args.rerender();
    });

    sortDirectionBtn.addEventListener("click", () => {
        let nextDirection: SortDirection = SORT_DIRECTION_ASC;
        if (NEXT_VIEW_STATE.sortDirection === SORT_DIRECTION_ASC) {
            nextDirection = SORT_DIRECTION_DESC;
        }
        NEXT_VIEW_STATE.sortDirection = nextDirection;
        args.rerender();
    });
}
