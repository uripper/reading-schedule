import { describeLookup, placeholderCoverSvg } from "./helpers.js";
import { createLookupInputHandler } from "./input.js";
import { handleLookupKeydown } from "./keyboard.js";
import {
  lookupResultTarget,
  renderLookupResults,
  updateComboboxA11y,
} from "./render.js";
import type { BookLookupItem } from "../app/types.js";

type LookupState = {
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  currentItems: BookLookupItem[];
  activeIndex: number;
};

type BindBookLookupOptions = {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick: (item: BookLookupItem) => void;
};

type LookupBinding = {
  clearResults: () => void;
  destroy: () => void;
};

export function bindBookLookup({
  searchInput,
  resultsEl,
  metaEl,
  onPick,
}: BindBookLookupOptions): LookupBinding {
  const placeholder = placeholderCoverSvg();
  const state: LookupState = {
    timer: null,
    token: 0,
    currentItems: [],
    activeIndex: -1,
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

  resultsEl.addEventListener("mousemove", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (target) {
      setActiveIndex(Number(target.dataset.resultIndex));
    }
  });
  resultsEl.addEventListener("click", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (target) {
      selectItem(Number(target.dataset.resultIndex));
    }
  });

  const onInput = createLookupInputHandler({
    searchInput,
    metaEl,
    state,
    clearResults,
    refreshResults,
  });
  searchInput.addEventListener("input", onInput);
  searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
    handleLookupKeydown(
      event,
      state.currentItems,
      state.activeIndex,
      setActiveIndex,
      selectItem,
      clearResults,
      searchInput,
    );
  });

  const onDocClick = (event: MouseEvent): void => {
    if (!(event.target instanceof Node)) {
      return;
    }
    if (event.target === searchInput || resultsEl.contains(event.target)) {
      return;
    }
    clearResults();
  };
  document.addEventListener("click", onDocClick);
  return {
    clearResults,
    destroy: () => document.removeEventListener("click", onDocClick),
  };
}
