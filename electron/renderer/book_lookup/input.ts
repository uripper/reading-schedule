import { type LookupInputHandlerArgs } from "../../types/types.js";
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
    const lookupState = state;
    const statusElement = metaEl;
    return (): void => {
        const query = searchInput.value.trim();
        if (lookupState.timer !== null) {
            clearTimeout(lookupState.timer);
        }

        if (query.length < MIN_QUERY_LENGTH) {
            clearResults();
            statusElement.textContent = "";
            return;
        }

        lookupState.timer = setTimeout((): void => {
            lookupState.token += 1;
            const currentToken = lookupState.token;
            getPlannerApi()
                .searchBooks(query)
                .then((fetchedItems): void => {
                    const items = fetchedItems.slice(0, RESULT_LIMIT);
                    if (currentToken !== lookupState.token) {
                        return;
                    }
                    lookupState.currentItems = items;
                    lookupState.activeIndex = -1;
                    if (items.length > 0) {
                        lookupState.activeIndex = 0;
                    }
                    if (items.length === 0) {
                        clearResults();
                        statusElement.textContent = "No matches found.";
                        return;
                    }
                    refreshResults();
                    statusElement.textContent =
                        "Select a result to fill details.";
                })
                .catch((): void => {
                    if (currentToken !== lookupState.token) {
                        return;
                    }
                    clearResults();
                    statusElement.textContent =
                        "Lookup unavailable; enter values manually.";
                });
        }, LOOKUP_DELAY_MS);
    };
}
