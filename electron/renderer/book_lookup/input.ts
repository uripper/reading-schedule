

const LOOKUP_DELAY_MS = 260;
const RESULT_LIMIT = 12;
const MIN_QUERY_LENGTH = 2;

export function createLookupInputHandler({
  searchInput,
  metaEl,
  state,
  clearResults,
  refreshResults,
}) {
  return () => {
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
        const items = (await globalThis.plannerApi.searchBooks(query)).slice(0, RESULT_LIMIT);
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
