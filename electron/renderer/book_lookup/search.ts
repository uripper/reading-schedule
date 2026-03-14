import type {
    BindBookLookupOptions,
    LookupBinding,
    LookupSearchState,
} from "../../types/types.ts";
import { placeholderCoverSvg } from "./helpers.ts";
import { createLookupInputHandler } from "./input.ts";
import { handleLookupKeydown } from "./keyboard.ts";
import { lookupResultTarget } from "./render.ts";
import { createLookupStateController } from "./search_state.ts";

interface LookupListHandlers {
    selectItem: (nextIndex: number) => void;
    setActiveIndex: (nextIndex: number) => void;
}

type BindLookupKeydownArgs = {
    options: BindBookLookupOptions;
    state: LookupSearchState;
    handlers: LookupListHandlers;
    clearResults: () => void;
};

type LookupActionHandlers = LookupListHandlers & {
    clearResults: () => void;
    refreshResults: () => void;
};

/**
 * Binds mousemove and click event listeners to a lookup results container element to update the active index and trigger selection.
 * @example
 * bindLookupResultEvents(resultsEl, handlers)
 * undefined
 * @param resultsEl - The container element that contains lookup result items (expects children with data-result-index attributes).
 * @param handlers - An object with setActiveIndex(index: number) and selectItem(index: number) methods invoked on hover and click respectively.
 * @returns No return value.
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
 * @param options - Configuration object that includes the searchInput HTML element to receive the keydown listener.
 * @param state - Current lookup search state containing activeIndex and currentItems.
 * @param handlers - Object with handler functions such as selectItem and setActiveIndex.
 * @param clearResults - Callback invoked to clear current search results.
 * @returns No return value; attaches a keydown event listener to the given search input.
 **/
function bindLookupKeydown(args: BindLookupKeydownArgs): void {
    args.options.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
        handleLookupKeydown({
            activeIndex: args.state.activeIndex,
            clearResults: args.clearResults,
            currentItems: args.state.currentItems,
            event,
            searchInput: args.options.searchInput,
            selectItem: args.handlers.selectItem,
            setActiveIndex: args.handlers.setActiveIndex,
        });
    });
}

function shouldClearLookupResults(
    target: Node,
    searchInput: HTMLInputElement,
    resultsEl: HTMLElement,
): boolean {
    if (target === searchInput) {
        return false;
    }
    return !resultsEl.contains(target);
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
        if (!shouldClearLookupResults(event.target, searchInput, resultsEl)) {
            return;
        }
        clearResults();
    };
}

function lookupActionHandlers(
    lookupState: ReturnType<typeof createLookupStateController>,
): LookupActionHandlers {
    return {
        clearResults: () => {
            lookupState.clearResults();
        },
        refreshResults: () => {
            lookupState.refreshResults();
        },
        selectItem: (nextIndex: number) => {
            lookupState.selectItem(nextIndex);
        },
        setActiveIndex: (nextIndex: number) => {
            lookupState.setActiveIndex(nextIndex);
        },
    };
}

function bindLookupInputEvents(args: {
    options: BindBookLookupOptions;
    state: LookupSearchState;
    handlers: LookupActionHandlers;
}): void {
    const ON_INPUT = createLookupInputHandler({
        clearResults: args.handlers.clearResults,
        metaEl: args.options.metaEl,
        refreshResults: args.handlers.refreshResults,
        searchInput: args.options.searchInput,
        state: args.state,
    });
    args.options.searchInput.addEventListener("input", ON_INPUT);
}

function bindLookupInteractions(args: {
    options: BindBookLookupOptions;
    state: LookupSearchState;
    handlers: LookupActionHandlers;
}): void {
    bindLookupResultEvents(args.options.resultsEl, args.handlers);
    bindLookupInputEvents(args);
    bindLookupKeydown({
        clearResults: args.handlers.clearResults,
        handlers: args.handlers,
        options: args.options,
        state: args.state,
    });
}

function lookupBinding(
    clearResults: () => void,
    onDocClick: (event: MouseEvent) => void,
): LookupBinding {
    return {
        clearResults,
        destroy: (): void => {
            document.removeEventListener("click", onDocClick);
        },
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
    const HANDLERS = lookupActionHandlers(LOOKUP_STATE);
    bindLookupInteractions({ handlers: HANDLERS, options, state: STATE });
    const ON_DOC_CLICK = createOutsideClickHandler(
        options.searchInput,
        options.resultsEl,
        HANDLERS.clearResults,
    );
    document.addEventListener("click", ON_DOC_CLICK);
    return lookupBinding(HANDLERS.clearResults, ON_DOC_CLICK);
}
