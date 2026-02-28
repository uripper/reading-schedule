import {
    type BindBookLookupOptions,
    type LookupBinding,
    type LookupSearchState,
} from "../../types/types.js";
import { placeholderCoverSvg } from "./helpers.js";
import { createLookupInputHandler } from "./input.js";
import { handleLookupKeydown } from "./keyboard.js";
import { lookupResultTarget } from "./render.js";
import { createLookupStateController } from "./search_state.js";

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
    const ON_INPUT = createLookupInputHandler({
        clearResults: CLEAR_RESULTS,
        metaEl: options.metaEl,
        refreshResults: REFRESH_RESULTS,
        searchInput: options.searchInput,
        state: STATE,
    });
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
