import type { LookupInputHandlerArgs } from "../../types/types.js";
import { getPlannerApi } from "../app/planner_api.js";

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

/**
 * Creates the debounced input handler that performs remote book lookup.
 * @param root0 Dependencies required for lookup query execution and rendering.
 * @param root0.searchInput Search field element.
 * @param root0.metaEl Metadata/help text element for lookup status.
 * @param root0.state Mutable lookup state (token, timer, current items).
 * @param root0.clearResults Clears current rendered lookup results.
 * @param root0.refreshResults Re-renders lookup results from current state.
 * @returns Input event handler for search field changes.
 */
export function createLookupInputHandler({
    searchInput,
    metaEl,
    state,
    clearResults,
    refreshResults,
}: LookupInputHandlerArgs): () => void {
    const LOOKUP_STATE = state;
    const STATUS_ELEMENT = metaEl;
    return (): void => {
        const QUERY = searchInput.value.trim();
        if (LOOKUP_STATE.timer !== null) {
            clearTimeout(LOOKUP_STATE.timer);
        }

        if (QUERY.length < MIN_QUERY_LENGTH) {
            clearResults();
            STATUS_ELEMENT.textContent = "";
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
                        STATUS_ELEMENT.textContent = "No matches found.";
                        return;
                    }
                    refreshResults();
                    STATUS_ELEMENT.textContent =
                        "Select a result to fill details.";
                })
                .catch((): void => {
                    if (CURRENT_TOKEN !== LOOKUP_STATE.token) {
                        return;
                    }
                    clearResults();
                    STATUS_ELEMENT.textContent =
                        "Lookup unavailable; enter values manually.";
                });
        }, LOOKUP_DELAY_MS);
    };
}
