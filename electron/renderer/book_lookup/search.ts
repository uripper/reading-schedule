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
    options.resultsEl.addEventListener("mousemove", (event: MouseEvent) => {
        const TARGET = lookupResultTarget(event);
        if (TARGET) {
            SET_ACTIVE_INDEX(Number(TARGET.dataset.resultIndex));
        }
    });
    options.resultsEl.addEventListener("click", (event: MouseEvent) => {
        const TARGET = lookupResultTarget(event);
        if (TARGET) {
            SELECT_ITEM(Number(TARGET.dataset.resultIndex));
        }
    });
    const ON_INPUT = createLookupInputHandler({
        clearResults: CLEAR_RESULTS,
        metaEl: options.metaEl,
        refreshResults: REFRESH_RESULTS,
        searchInput: options.searchInput,
        state: STATE,
    });
    options.searchInput.addEventListener("input", ON_INPUT);
    options.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
        handleLookupKeydown({
            activeIndex: STATE.activeIndex,
            clearResults: CLEAR_RESULTS,
            currentItems: STATE.currentItems,
            event,
            searchInput: options.searchInput,
            selectItem: SELECT_ITEM,
            setActiveIndex: SET_ACTIVE_INDEX,
        });
    });
    const ON_DOC_CLICK = (event: MouseEvent): void => {
        if (!(event.target instanceof Node)) {
            return;
        }
        if (
            event.target === options.searchInput ||
            options.resultsEl.contains(event.target)
        ) {
            return;
        }
        CLEAR_RESULTS();
    };
    document.addEventListener("click", ON_DOC_CLICK);
    return {
        clearResults: CLEAR_RESULTS,
        destroy: (): void => {
            document.removeEventListener("click", ON_DOC_CLICK);
        },
    };
}
