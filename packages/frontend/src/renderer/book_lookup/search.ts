/** Binds the Open Library search control and its keyboard-accessible result list. */
import type {
    BindBookLookupOptions,
    LookupBinding,
    LookupQueryArgs,
    LookupSearchState,
    LookupStateController,
} from "../../types/types.ts";
import { placeholderCoverSvg } from "./helpers.ts";
import { clearLookupQuery, submitLookupQuery } from "./input.ts";
import { handleLookupKeydown } from "./keyboard.ts";
import { lookupResultTarget } from "./render.ts";
import { createLookupStateController } from "./search_state.ts";

/** Maps pointer actions on result rows to the matching lookup item. */
function bindLookupResults(
    resultsEl: HTMLElement,
    controller: LookupStateController,
    signal: AbortSignal,
): void {
    resultsEl.addEventListener(
        "mousemove",
        (event) => {
            const TARGET = lookupResultTarget(event);
            if (TARGET) {
                controller.setActiveIndex(Number(TARGET.dataset.resultIndex));
            }
        },
        { signal },
    );
    resultsEl.addEventListener(
        "click",
        (event) => {
            const TARGET = lookupResultTarget(event);
            if (TARGET) {
                controller.selectItem(Number(TARGET.dataset.resultIndex));
            }
        },
        { signal },
    );
}

/** Clears stale results when the user clicks outside the search controls. */
function bindOutsideClick(
    options: BindBookLookupOptions,
    clearResults: () => void,
    signal: AbortSignal,
): void {
    document.addEventListener(
        "click",
        (event) => {
            const TARGET = event.target;
            if (!(TARGET instanceof Node) || TARGET === options.searchInput) {
                return;
            }
            if (
                options.searchButton.contains(TARGET) ||
                options.resultsEl.contains(TARGET)
            ) {
                return;
            }
            clearResults();
        },
        { signal },
    );
}

/** Starts queries only on explicit activation and clears results as the text changes. */
function bindLookupControls(args: {
    controller: LookupStateController;
    options: BindBookLookupOptions;
    query: LookupQueryArgs;
    signal: AbortSignal;
}): void {
    const { controller, options, query, signal } = args;
    const CLEAR = () => {
        clearLookupQuery(query);
    };
    const SUBMIT = () => {
        submitLookupQuery(query);
    };
    options.searchInput.addEventListener("input", CLEAR, { signal });
    options.searchButton.addEventListener(
        "click",
        () => {
            options.searchInput.focus();
            SUBMIT();
        },
        { signal },
    );
    options.searchInput.addEventListener(
        "keydown",
        (event) => {
            handleLookupKeydown({
                event,
                activeIndex: query.state.activeIndex,
                clearResults: CLEAR,
                currentItems: query.state.currentItems,
                searchInput: options.searchInput,
                selectItem: (index) => {
                    controller.selectItem(index);
                },
                setActiveIndex: (index) => {
                    controller.setActiveIndex(index);
                },
                submitQuery: SUBMIT,
            });
        },
        { signal },
    );
    bindOutsideClick(options, CLEAR, signal);
}

/** Creates the state and rendering controller shared by the two search triggers. */
function createLookupController(
    options: BindBookLookupOptions,
    state: LookupSearchState,
): LookupStateController {
    return createLookupStateController({
        state,
        metaEl: options.metaEl,
        onPick: options.onPick,
        placeholder: placeholderCoverSvg(),
        resultsEl: options.resultsEl,
        searchInput: options.searchInput,
    });
}

/** Binds explicit search, result selection, and cancellation for the book form. */
export function bindBookLookup(options: BindBookLookupOptions): LookupBinding {
    const STATE: LookupSearchState = {
        activeIndex: -1,
        currentItems: [],
        token: 0,
    };
    const CONTROLLER = createLookupController(options, STATE);
    const QUERY: LookupQueryArgs = {
        clearResults: CONTROLLER.clearResults,
        metaEl: options.metaEl,
        refreshResults: () => {
            CONTROLLER.refreshResults();
        },
        searchInput: options.searchInput,
        state: STATE,
    };
    const BINDING = new AbortController();
    bindLookupControls({
        controller: CONTROLLER,
        options,
        query: QUERY,
        signal: BINDING.signal,
    });
    bindLookupResults(options.resultsEl, CONTROLLER, BINDING.signal);
    return {
        clearResults: () => {
            clearLookupQuery(QUERY);
        },
        destroy: () => {
            BINDING.abort();
            clearLookupQuery(QUERY);
        },
    };
}
