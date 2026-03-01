import {
    type BindBookLookupOptions,
    type LookupBinding,
    type LookupSearchState,
} from "../../types/types.js";
import { getPlannerApi } from "../app/planner_api.js";
import { placeholderCoverSvg } from "./helpers.js";
import { handleLookupKeydown } from "./keyboard.js";
import { lookupResultTarget } from "./render.js";
import { createLookupStateController } from "./search_state.js";

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

interface LookupListHandlers {
    selectItem: (nextIndex: number) => void;
    setActiveIndex: (nextIndex: number) => void;
}

function bindLookupResultEvents(
    resultsEl: HTMLElement,
    handlers: LookupListHandlers,
): void {
    resultsEl.addEventListener("mousemove", (event: MouseEvent) => {
        const TARGET = lookupResultTarget(event);
        if (TARGET) {
            handlers.setActiveIndex(Number(TARGET.dataset.resultIndex));
        }
    });
    resultsEl.addEventListener("click", (event: MouseEvent) => {
        const TARGET = lookupResultTarget(event);
        if (TARGET) {
            handlers.selectItem(Number(TARGET.dataset.resultIndex));
        }
    });
}

function bindLookupKeydown(
    options: BindBookLookupOptions,
    state: LookupSearchState,
    handlers: LookupListHandlers,
    clearResults: () => void,
): void {
    options.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
        handleLookupKeydown({
            activeIndex: state.activeIndex,
            clearResults,
            currentItems: state.currentItems,
            event,
            searchInput: options.searchInput,
            selectItem: handlers.selectItem,
            setActiveIndex: handlers.setActiveIndex,
        });
    });
}

function createLookupInputHandler(
    options: BindBookLookupOptions,
    state: LookupSearchState,
    clearResults: () => void,
    refreshResults: () => void,
): () => void {
    const LOOKUP_STATE = state;
    return (): void => {
        const QUERY = options.searchInput.value.trim();
        if (LOOKUP_STATE.timer !== null) {
            clearTimeout(LOOKUP_STATE.timer);
        }

        if (QUERY.length < MIN_QUERY_LENGTH) {
            clearResults();
            options.metaEl.textContent = "";
            return;
        }

        LOOKUP_STATE.timer = setTimeout((): void => {
            LOOKUP_STATE.token += 1;
            const CURRENT_TOKEN = LOOKUP_STATE.token;
            getPlannerApi()
                .searchBooks(QUERY)
                .then((fetchedItems): void => {
                    const ITEMS = fetchedItems.slice(0, RESULT_LIMIT);
                    if (CURRENT_TOKEN !== LOOKUP_STATE.token) {
                        return;
                    }
                    LOOKUP_STATE.currentItems = ITEMS;
                    LOOKUP_STATE.activeIndex = -1;
                    if (ITEMS.length > 0) {
                        LOOKUP_STATE.activeIndex = 0;
                    }
                    if (ITEMS.length === 0) {
                        clearResults();
                        options.metaEl.textContent = "No matches found.";
                        return;
                    }
                    refreshResults();
                    options.metaEl.textContent =
                        "Select a result to fill details.";
                })
                .catch((): void => {
                    if (CURRENT_TOKEN !== LOOKUP_STATE.token) {
                        return;
                    }
                    clearResults();
                    options.metaEl.textContent =
                        "Lookup unavailable; enter values manually.";
                });
        }, LOOKUP_DELAY_MS);
    };
}

function createOutsideClickHandler(
    searchInput: HTMLInputElement,
    resultsEl: HTMLElement,
    clearResults: () => void,
): (event: MouseEvent) => void {
    return (event: MouseEvent): void => {
        if (!(event.target instanceof Node)) {
            return;
        }
        if (event.target === searchInput || resultsEl.contains(event.target)) {
            return;
        }
        clearResults();
    };
}

/**
 * Binds all lookup search interactions (input, keyboard, mouse, outside click).
 * @param options Lookup binding options and callbacks.
 * @param options.searchInput Search field element.
 * @param options.resultsEl Lookup results container element.
 * @param options.metaEl Metadata/help text element.
 * @param options.onPick Callback invoked when a lookup result is selected.
 * @returns Binding handle with clear/destroy controls.
 */
export function bindBookLookup(options: BindBookLookupOptions): LookupBinding {
    const PLACEHOLDER = placeholderCoverSvg();
    const STATE: LookupSearchState = {
        activeIndex: -1,
        currentItems: [],
        timer: null,
        token: 0,
    };
    const LOOKUP_STATE = createLookupStateController({
        metaEl: options.metaEl,
        onPick: options.onPick,
        placeholder: PLACEHOLDER,
        resultsEl: options.resultsEl,
        searchInput: options.searchInput,
        state: STATE,
    });
    const CLEAR_RESULTS = (): void => {
        LOOKUP_STATE.clearResults();
    };
    const REFRESH_RESULTS = (): void => {
        LOOKUP_STATE.refreshResults();
    };
    const SET_ACTIVE_INDEX = (nextIndex: number): void => {
        LOOKUP_STATE.setActiveIndex(nextIndex);
    };
    const SELECT_ITEM = (nextIndex: number): void => {
        LOOKUP_STATE.selectItem(nextIndex);
    };
    bindLookupResultEvents(options.resultsEl, {
        selectItem: SELECT_ITEM,
        setActiveIndex: SET_ACTIVE_INDEX,
    });
    const ON_INPUT = createLookupInputHandler(
        options,
        STATE,
        CLEAR_RESULTS,
        REFRESH_RESULTS,
    );
    options.searchInput.addEventListener("input", ON_INPUT);
    bindLookupKeydown(
        options,
        STATE,
        {
            selectItem: SELECT_ITEM,
            setActiveIndex: SET_ACTIVE_INDEX,
        },
        CLEAR_RESULTS,
    );
    const ON_DOC_CLICK = createOutsideClickHandler(
        options.searchInput,
        options.resultsEl,
        CLEAR_RESULTS,
    );
    document.addEventListener("click", ON_DOC_CLICK);
    return {
        clearResults: CLEAR_RESULTS,
        destroy: (): void => {
            document.removeEventListener("click", ON_DOC_CLICK);
        },
    };
}
