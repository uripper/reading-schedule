import type { BookLookupItem } from "../app/types.js";
import { describeLookup } from "./helpers.js";
import { renderLookupResults, updateComboboxA11y } from "./render.js";

interface LookupState {
  currentItems: BookLookupItem[];
  activeIndex: number;
}

interface CreateLookupStateControllerArgs {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(item: BookLookupItem): void;
  placeholder: string;
  state: LookupState;
}

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
