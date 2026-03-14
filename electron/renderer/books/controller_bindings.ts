import type {
    BindToolbarEventsArgs,
    BooksControllerRefs,
    SortDirection,
} from "../../types/types.ts";
import { toGroupBy, toSortBy } from "./controller_types.ts";
import { normalizeStatusFilter } from "./status.ts";
import { SORT_DIRECTION_ASC, SORT_DIRECTION_DESC } from "./toolbar.ts";

type ToolbarControls = {
    titleFilterInput: HTMLInputElement;
    sortBySelect: HTMLSelectElement;
    shelfFilterSelect: HTMLSelectElement;
    statusFilterSelect: HTMLSelectElement;
    groupBySelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
};

function requiredInput(
    control: unknown,
    message: string,
): HTMLInputElement {
    if (control instanceof HTMLInputElement) {
        return control;
    }
    throw new TypeError(message);
}

function requiredSelect(
    control: unknown,
    message: string,
): HTMLSelectElement {
    if (control instanceof HTMLSelectElement) {
        return control;
    }
    throw new TypeError(message);
}

function requiredButton(
    control: unknown,
    message: string,
): HTMLButtonElement {
    if (control instanceof HTMLButtonElement) {
        return control;
    }
    throw new TypeError(message);
}

/**
 * Validates and unwraps toolbar control references required for event binding.
 * @param refs - Controller DOM references collected during books UI setup.
 * @returns Strongly typed toolbar controls ready for listener registration.
 */
function assertToolbarControls(refs: BooksControllerRefs): ToolbarControls {
    return {
        groupBySelect: requiredSelect(
            refs.groupBySelect,
            "Books toolbar group-by control is missing or invalid.",
        ),
        shelfFilterSelect: requiredSelect(
            refs.shelfFilterSelect,
            "Books toolbar shelf-filter control is missing or invalid.",
        ),
        sortBySelect: requiredSelect(
            refs.sortBySelect,
            "Books toolbar sort-by control is missing or invalid.",
        ),
        sortDirectionBtn: requiredButton(
            refs.sortDirectionBtn,
            "Books toolbar sort-direction control is missing or invalid.",
        ),
        statusFilterSelect: requiredSelect(
            refs.statusFilterSelect,
            "Books toolbar status-filter control is missing or invalid.",
        ),
        titleFilterInput: requiredInput(
            refs.titleFilterInput,
            "Books toolbar title-filter control is missing or invalid.",
        ),
    };
}

function bindTitleFilterEvents(args: {
    titleFilterInput: HTMLInputElement;
    rerender: () => void;
    viewState: BindToolbarEventsArgs["viewState"];
}): void {
    const APPLY_TITLE_FILTER = (): void => {
        args.viewState.titleFilter = String(args.titleFilterInput.value || "");
        args.rerender();
    };
    args.titleFilterInput.addEventListener("input", APPLY_TITLE_FILTER);
    args.titleFilterInput.addEventListener("change", APPLY_TITLE_FILTER);
}

function bindSelectChange(
    select: HTMLSelectElement,
    onChange: () => void,
): void {
    select.addEventListener("change", onChange);
}

function bindSortDirectionToggle(args: {
    button: HTMLButtonElement;
    rerender: () => void;
    viewState: BindToolbarEventsArgs["viewState"];
}): void {
    args.button.addEventListener("click", () => {
        let nextDirection: SortDirection = SORT_DIRECTION_ASC;
        if (args.viewState.sortDirection === SORT_DIRECTION_ASC) {
            nextDirection = SORT_DIRECTION_DESC;
        }
        args.viewState.sortDirection = nextDirection;
        args.rerender();
    });
}

/**
 * Attaches toolbar listeners and synchronizes control changes into view state.
 * @param args - Event binding inputs.
 * @param refs - Controller DOM references for toolbar controls.
 * @param viewState - Mutable view state driving books rendering.
 * @param rerender - Callback that refreshes the books view.
 */
export function bindToolbarEvents(args: BindToolbarEventsArgs): void {
    const {
        titleFilterInput,
        sortBySelect,
        shelfFilterSelect,
        statusFilterSelect,
        groupBySelect,
        sortDirectionBtn,
    } = assertToolbarControls(args.refs);
    bindTitleFilterEvents({
        rerender: args.rerender,
        titleFilterInput,
        viewState: args.viewState,
    });
    bindSelectChange(sortBySelect, () => {
        args.viewState.sortBy = toSortBy(sortBySelect.value);
        args.rerender();
    });
    bindSelectChange(shelfFilterSelect, () => {
        args.viewState.shelfFilter = shelfFilterSelect.value;
        args.rerender();
    });
    bindSelectChange(statusFilterSelect, () => {
        args.viewState.statusFilter = normalizeStatusFilter(
            statusFilterSelect.value,
        );
        args.rerender();
    });
    bindSelectChange(groupBySelect, () => {
        args.viewState.groupBy = toGroupBy(groupBySelect.value);
        args.rerender();
    });
    bindSortDirectionToggle({
        button: sortDirectionBtn,
        rerender: args.rerender,
        viewState: args.viewState,
    });
}
