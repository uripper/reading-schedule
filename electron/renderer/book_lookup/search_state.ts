import {
    type CreateLookupStateControllerArgs,
    type LookupStateController,
} from "../../types/types.js";
import { describeLookup } from "./helpers.js";
import { renderLookupResults, updateComboboxA11y } from "./render.js";

/**
 * Creates lookup state actions for rendering, clearing, selecting, and highlighting items.
 * @param root0 Lookup UI elements, callbacks, and mutable state.
 * @param root0.searchInput Search field element.
 * @param root0.resultsEl Lookup results container element.
 * @param root0.metaEl Metadata/help text element.
 * @param root0.onPick Callback invoked when a result is selected.
 * @param root0.placeholder Placeholder cover image URL.
 * @param root0.state Mutable lookup state containing items and active index.
 * @returns State controller methods for lookup UI updates.
 */
export function createLookupStateController({
    searchInput,
    resultsEl,
    metaEl,
    onPick,
    placeholder,
    state,
}: CreateLookupStateControllerArgs): LookupStateController {
    const LOOKUP_STATE = state;
    const SEARCH_FIELD = searchInput;
    const RESULTS_ELEMENT = resultsEl;
    const STATUS_ELEMENT = metaEl;
    const REFRESH_RESULTS = (): void => {
        const HAS_ITEMS = LOOKUP_STATE.currentItems.length > 0;
        if (!HAS_ITEMS) {
            RESULTS_ELEMENT.classList.remove("has-items");
            RESULTS_ELEMENT.innerHTML = "";
            updateComboboxA11y(SEARCH_FIELD, RESULTS_ELEMENT, false, -1);
            return;
        }

        renderLookupResults(
            RESULTS_ELEMENT,
            LOOKUP_STATE.currentItems,
            placeholder,
            LOOKUP_STATE.activeIndex,
        );
        RESULTS_ELEMENT.classList.add("has-items");
        updateComboboxA11y(
            SEARCH_FIELD,
            RESULTS_ELEMENT,
            true,
            LOOKUP_STATE.activeIndex,
        );
    };

    const CLEAR_RESULTS = (): void => {
        LOOKUP_STATE.currentItems = [];
        LOOKUP_STATE.activeIndex = -1;
        REFRESH_RESULTS();
    };

    const SELECT_ITEM = (index: number): void => {
        if (index < 0 || index >= LOOKUP_STATE.currentItems.length) {
            return;
        }
        const ITEM = LOOKUP_STATE.currentItems[index];
        SEARCH_FIELD.value = String(ITEM.title ?? "");
        STATUS_ELEMENT.textContent = describeLookup(ITEM);
        CLEAR_RESULTS();
        onPick(ITEM);
    };

    const SET_ACTIVE_INDEX = (index: number): void => {
        if (LOOKUP_STATE.currentItems.length === 0) {
            LOOKUP_STATE.activeIndex = -1;
            REFRESH_RESULTS();
            return;
        }

        const BOUNDED =
            ((index % LOOKUP_STATE.currentItems.length) +
                LOOKUP_STATE.currentItems.length) %
            LOOKUP_STATE.currentItems.length;
        LOOKUP_STATE.activeIndex = BOUNDED;
        REFRESH_RESULTS();
    };

    return {
        clearResults: CLEAR_RESULTS,
        refreshResults: REFRESH_RESULTS,
        selectItem: SELECT_ITEM,
        setActiveIndex: SET_ACTIVE_INDEX,
    };
}
