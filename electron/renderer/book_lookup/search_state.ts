import type { BookLookupItem } from "../app/types.js";
import { describeLookup } from "./helpers.js";
import { renderLookupResults, updateComboboxA11y } from "./render.js";

type LookupState = {
  currentItems: BookLookupItem[];
  activeIndex: number;
};

type CreateLookupStateControllerArgs = {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick: (item: BookLookupItem) => void;
  placeholder: string;
  state: LookupState;
};

export function createLookupStateController({
  searchInput,
  resultsEl,
  metaEl,
  onPick,
  placeholder,
  state,
}: CreateLookupStateControllerArgs) {
  const refreshResults = (): void => {
    const hasItems = state.currentItems.length > 0;
    if (!hasItems) {
      resultsEl.classList.remove("has-items");
      resultsEl.innerHTML = "";
      updateComboboxA11y(searchInput, resultsEl, false, -1);
      return;
    }

    renderLookupResults(
      resultsEl,
      state.currentItems,
      placeholder,
      state.activeIndex,
    );
    resultsEl.classList.add("has-items");
    updateComboboxA11y(searchInput, resultsEl, true, state.activeIndex);
  };

  const clearResults = (): void => {
    state.currentItems = [];
    state.activeIndex = -1;
    refreshResults();
  };

  const selectItem = (index: number): void => {
    const item = state.currentItems[index];
    if (!item) {
      return;
    }
    searchInput.value = item.title || "";
    metaEl.textContent = describeLookup(item);
    clearResults();
    onPick(item);
  };

  const setActiveIndex = (index: number): void => {
    if (!state.currentItems.length) {
      state.activeIndex = -1;
      refreshResults();
      return;
    }

    const bounded =
      ((index % state.currentItems.length) + state.currentItems.length) %
      state.currentItems.length;
    state.activeIndex = bounded;
    refreshResults();
  };

  return {
    clearResults,
    refreshResults,
    selectItem,
    setActiveIndex,
  };
}
