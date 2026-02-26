import { placeholderCoverSvg } from "./helpers.js";
import { createLookupInputHandler } from "./input.js";
import { handleLookupKeydown } from "./keyboard.js";
import { createLookupStateController } from "./search_state.js";
import {
  lookupResultTarget,
} from "./render.js";
import type { BookLookupItem } from "../../types/types.js";

interface LookupState {
  timer: ReturnType<typeof setTimeout> | null;
  token: number;
  currentItems: BookLookupItem[];
  activeIndex: number;
}

interface BindBookLookupOptions {
  searchInput: HTMLInputElement;
  resultsEl: HTMLElement;
  metaEl: HTMLElement;
  onPick(this: void, item: BookLookupItem): void;
}

interface LookupBinding {
  clearResults(): void;
  destroy(): void;
}

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
  const state: LookupState = {
    timer: null,
    token: 0,
    currentItems: [],
    activeIndex: -1,
  };
  const lookupState = createLookupStateController({
    searchInput: options.searchInput,
    resultsEl: options.resultsEl,
    metaEl: options.metaEl,
    onPick: options.onPick,
    placeholder,
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
    searchInput: options.searchInput,
    metaEl: options.metaEl,
    state,
    clearResults,
    refreshResults,
  });
  options.searchInput.addEventListener("input", onInput);
  options.searchInput.addEventListener("keydown", (event: KeyboardEvent) => {
    handleLookupKeydown({
      event,
      currentItems: state.currentItems,
      activeIndex: state.activeIndex,
      setActiveIndex,
      selectItem,
      clearResults,
      searchInput: options.searchInput,
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
