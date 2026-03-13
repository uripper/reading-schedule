import type {
    BindBookLookupOptions,
    LookupBinding,
    LookupSearchState,
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

/**
 * Binds mousemove and click event listeners to a lookup results container element to update the active index and trigger selection.
 * @example
 * bindLookupResultEvents(resultsEl, handlers)
 * undefined
 * @param {{HTMLElement}} {{resultsEl}} - The container element that contains lookup result items (expects children with data-result-index attributes).
 * @param {{LookupListHandlers}} {{handlers}} - An object with setActiveIndex(index: number) and selectItem(index: number) methods invoked on hover and click respectively.
 * @returns {{void}} No return value.
 **/
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

/**
 * Attach a keydown event listener to the provided search input to handle lookup navigation and selection.
 * @example
 * bindLookupKeydown(options, state, handlers, clearResults)
 * undefined
 * @param {{BindBookLookupOptions}} {{options}} - Configuration object that includes the searchInput HTML element to receive the keydown listener.
 * @param {{LookupSearchState}} {{state}} - Current lookup search state containing activeIndex and currentItems.
 * @param {{LookupListHandlers}} {{handlers}} - Object with handler functions such as selectItem and setActiveIndex.
 * @param {{() => void}} {{clearResults}} - Callback invoked to clear current search results.
 * @returns {{void}} No return value; attaches a keydown event listener to the given search input.
 **/
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

/**
 * Creates an event handler that clears search results when clicking outside the search input or results element.
 * @example
 * createOutsideClickHandler(searchInput, resultsEl, clearResults)
 * (event) => { ... }
 * @param {HTMLInputElement} searchInput - The input element that should not trigger clearing when clicked.
 * @param {HTMLElement} resultsEl - The results container element that should not trigger clearing when clicked.
 * @param {() => void} clearResults - Callback invoked to clear the current search results.
 * @returns {(event: MouseEvent) => void} A mouse event handler that clears results when a click occurs outside the input and results elements.
 */
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
 * @param options - Lookup binding options and callbacks.
 * @param searchInput - Search field element.
 * @param resultsEl - Lookup results container element.
 * @param metaEl - Metadata/help text element.
 * @param onPick - Callback invoked when a lookup result is selected.
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
