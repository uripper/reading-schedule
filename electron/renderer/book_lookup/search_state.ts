
import { describeLookup } from "./helpers.js";
import { renderLookupResults, updateComboboxA11y } from "./render.js";
import type { CreateLookupStateControllerArgs, LookupStateController } from "../../types/types_lookup.js";

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
  const lookupState = state;
  const searchField = searchInput;
  const resultsElement = resultsEl;
  const statusElement = metaEl;
  const refreshResults = (): void => {
    const hasItems = lookupState.currentItems.length > 0;
    if (!hasItems) {
      resultsElement.classList.remove("has-items");
      resultsElement.innerHTML = "";
      updateComboboxA11y(searchField, resultsElement, false, -1);
      return;
    }

    renderLookupResults(
      resultsElement,
      lookupState.currentItems,
      placeholder,
      lookupState.activeIndex,
    );
    resultsElement.classList.add("has-items");
    updateComboboxA11y(searchField, resultsElement, true, lookupState.activeIndex);
  };

  const clearResults = (): void => {
    lookupState.currentItems = [];
    lookupState.activeIndex = -1;
    refreshResults();
  };

  const selectItem = (index: number): void => {
    if (index < 0 || index >= lookupState.currentItems.length) {
      return;
    }
    const item = lookupState.currentItems[index];
    searchField.value = String(item.title ?? "");
    statusElement.textContent = describeLookup(item);
    clearResults();
    onPick(item);
  };

  const setActiveIndex = (index: number): void => {
    if (lookupState.currentItems.length === 0) {
      lookupState.activeIndex = -1;
      refreshResults();
      return;
    }

    const bounded =
      ((index % lookupState.currentItems.length) + lookupState.currentItems.length) %
      lookupState.currentItems.length;
    lookupState.activeIndex = bounded;
    refreshResults();
  };

  return {
    clearResults,
    refreshResults,
    selectItem,
    setActiveIndex,
  };
}
