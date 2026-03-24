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

function requiredInput(control: unknown, message: string): HTMLInputElement {
    if (control instanceof HTMLInputElement) {
        return control;
    }
    throw new TypeError(message);
}

function requiredSelect(control: unknown, message: string): HTMLSelectElement {
    if (control instanceof HTMLSelectElement) {
        return control;
    }
    throw new TypeError(message);
}

function requiredButton(control: unknown, message: string): HTMLButtonElement {
    if (control instanceof HTMLButtonElement) {
        return control;
    }
    throw new TypeError(message);
}

function toolbarTitleFilterControl(
    refs: BooksControllerRefs,
): Pick<ToolbarControls, "titleFilterInput"> {
    return {
        titleFilterInput: requiredInput(
            refs.titleFilterInput,
            "Books toolbar title-filter control is missing or invalid.",
        ),
    };
}

function toolbarFilterControls(refs: BooksControllerRefs) {
    return {
        ...toolbarTitleFilterControl(refs),
        groupBySelect: requiredSelect(
            refs.groupBySelect,
            "Books toolbar group-by control is missing or invalid.",
        ),
        shelfFilterSelect: requiredSelect(
            refs.shelfFilterSelect,
            "Books toolbar shelf-filter control is missing or invalid.",
        ),
        statusFilterSelect: requiredSelect(
            refs.statusFilterSelect,
            "Books toolbar status-filter control is missing or invalid.",
        ),
    };
}

function toolbarSortControls(refs: BooksControllerRefs) {
    return {
        sortBySelect: requiredSelect(
            refs.sortBySelect,
            "Books toolbar sort-by control is missing or invalid.",
        ),
        sortDirectionBtn: requiredButton(
            refs.sortDirectionBtn,
            "Books toolbar sort-direction control is missing or invalid.",
        ),
    };
}

/**
 * Validates and unwraps toolbar control references required for event binding.
 * @param refs - Controller DOM references collected during books UI setup.
 * @returns Strongly typed toolbar controls ready for listener registration.
 */
function assertToolbarControls(refs: BooksControllerRefs): ToolbarControls {
    return {
        ...toolbarFilterControls(refs),
        ...toolbarSortControls(refs),
    };
}

function bindTitleFilterEvents(args: {
    titleFilterInput: HTMLInputElement;
    rerender: () => void;
    viewState: BindToolbarEventsArgs["viewState"];
}): void {
    const VIEW_STATE = args.viewState;
    const APPLY_TITLE_FILTER = (): void => {
        VIEW_STATE.titleFilter = String(args.titleFilterInput.value || "");
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
    const VIEW_STATE = args.viewState;
    args.button.addEventListener("click", () => {
        let nextDirection: SortDirection = SORT_DIRECTION_ASC;
        if (VIEW_STATE.sortDirection === SORT_DIRECTION_ASC) {
            nextDirection = SORT_DIRECTION_DESC;
        }
        VIEW_STATE.sortDirection = nextDirection;
        args.rerender();
    });
}

function bindFilterSelectEvents(args: {
    controls: ToolbarControls;
    rerender: () => void;
    viewState: BindToolbarEventsArgs["viewState"];
}): void {
    const VIEW_STATE = args.viewState;
    bindSelectChange(args.controls.sortBySelect, () => {
        VIEW_STATE.sortBy = toSortBy(args.controls.sortBySelect.value);
        args.rerender();
    });
    bindSelectChange(args.controls.shelfFilterSelect, () => {
        VIEW_STATE.shelfFilter = args.controls.shelfFilterSelect.value;
        args.rerender();
    });
    bindSelectChange(args.controls.statusFilterSelect, () => {
        VIEW_STATE.statusFilter = normalizeStatusFilter(
            args.controls.statusFilterSelect.value,
        );
        args.rerender();
    });
    bindSelectChange(args.controls.groupBySelect, () => {
        VIEW_STATE.groupBy = toGroupBy(args.controls.groupBySelect.value);
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
    const CONTROLS = assertToolbarControls(args.refs);
    bindTitleFilterEvents({
        rerender: args.rerender,
        titleFilterInput: CONTROLS.titleFilterInput,
        viewState: args.viewState,
    });
    bindFilterSelectEvents({
        controls: CONTROLS,
        rerender: args.rerender,
        viewState: args.viewState,
    });
    bindSortDirectionToggle({
        button: CONTROLS.sortDirectionBtn,
        rerender: args.rerender,
        viewState: args.viewState,
    });
}
