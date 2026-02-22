import { placeholderCoverSvg } from "./helpers.js";
import { createLookupInputHandler } from "./input.js";
import { handleLookupKeydown } from "./keyboard.js";
import { createLookupStateController } from "./search_state.js";
import {
  lookupResultTarget,
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
  const {
    clearResults,
    refreshResults,
    selectItem,
    setActiveIndex,
  } = createLookupStateController({
    searchInput,
    resultsEl,
    metaEl,
    onPick,
    placeholder,
    state,
  });

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
