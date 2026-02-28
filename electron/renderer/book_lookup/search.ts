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
    const placeholder = placeholderCoverSvg();
    const state: LookupSearchState = {
        activeIndex: -1,
        currentItems: [],
        timer: null,
        token: 0,
    };
    const lookupState = createLookupStateController({
        metaEl: options.metaEl,
        onPick: options.onPick,
        placeholder,
        resultsEl: options.resultsEl,
        searchInput: options.searchInput,
        state,
    });
    const clearResults = (): void => {
        lookupState.clearResults();
    };
    const refreshResults = (): void => {
        lookupState.refreshResults();
    };
    const setActiveIndex = (nextIndex: number): void => {
        lookupState.setActiveIndex(nextIndex);
    };
    const selectItem = (nextIndex: number): void => {
        lookupState.selectItem(nextIndex);
    };
    options.resultsEl.addEventListener("mousemove", (event: MouseEvent) => {
        const target = lookupResultTarget(event);
        if (target) {
            setActiveIndex(Number(target.dataset.resultIndex));
        }
    });
    options.resultsEl.addEventListener("click", (event: MouseEvent) => {
        const target = lookupResultTarget(event);
        if (target) {
            selectItem(Number(target.dataset.resultIndex));
        }
    });
    const onInput = createLookupInputHandler({
        clearResults,
        metaEl: options.metaEl,
        refreshResults,
        searchInput: options.searchInput,
        state,
    });
    options.searchInput.addEventListener("input", onInput);
    options.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
        handleLookupKeydown({
            activeIndex: state.activeIndex,
            clearResults,
            currentItems: state.currentItems,
            event,
            searchInput: options.searchInput,
            selectItem,
            setActiveIndex,
        });
    });
    const onDocClick = (event: MouseEvent): void => {
        if (!(event.target instanceof Node)) {
            return;
        }
        if (
            event.target === options.searchInput ||
            options.resultsEl.contains(event.target)
        ) {
            return;
        }
        clearResults();
    };
    document.addEventListener("click", onDocClick);
    return {
        clearResults,
        destroy: (): void => {
            document.removeEventListener("click", onDocClick);
        },
    };
}
