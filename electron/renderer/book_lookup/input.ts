import type { BookLookupItem } from "../app/types.js";
import { getPlannerApi } from "../app/planner_api.js";

interface LookupState {
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  currentItems: BookLookupItem[];
  activeIndex: number;
}

interface LookupInputHandlerArgs {
  searchInput: HTMLInputElement;
  metaEl: HTMLElement;
  state: LookupState;
  clearResults(): void;
  refreshResults(): void;
}

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
  return (): void => {
    const query = searchInput.value.trim();
    if (state.timer) {
      clearTimeout(state.timer);
    }

    if (query.length < MIN_QUERY_LENGTH) {
      clearResults();
      metaEl.textContent = "";
      return;
    }

    state.timer = setTimeout(async () => {
      state.token += 1;
      const currentToken = state.token;
      try {
        const items = (await getPlannerApi().searchBooks(query)).slice(
          0,
          RESULT_LIMIT,
        );
        if (currentToken !== state.token) {
          return;
        }
        state.currentItems = items;
        state.activeIndex = -1;
        if (items.length) {
          state.activeIndex = 0;
        }
        if (!items.length) {
          clearResults();
          metaEl.textContent = "No matches found.";
          return;
        }
        refreshResults();
        metaEl.textContent = "Select a result to fill details.";
      } catch {
        if (currentToken !== state.token) {
          return;
        }
        clearResults();
        metaEl.textContent = "Lookup unavailable; enter values manually.";
      }
    }, LOOKUP_DELAY_MS);
  };
}
