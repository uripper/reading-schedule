import type { BookFormRefs } from "./form_refs.js";
import {
  lookupResultTarget,
  shouldKeepPickerOpen,
  wrapIndex,
} from "./after_book_picker_helpers.js";
import type { Book } from "./types.js";
import type { PickerState } from "./after_book_picker_render.js";
import { NO_ACTIVE_INDEX } from "./after_book_picker_render.js";

interface BindingArgs {
  clearResults(): void;
  refs: BookFormRefs;
  refreshFiltered(clearChangedSelection: boolean): void;
  render(): void;
  selectBook(book: Book | null | undefined): void;
  state: PickerState;
}

/**
 * Binds keyboard/mouse/document events for after-book picker interactions.
 * @param root0 Event-binding dependencies and state hooks.
 * @param root0.clearResults Clears currently filtered picker results.
 * @param root0.refs Form references containing picker controls.
 * @param root0.refreshFiltered Rebuilds filtered picker options from input text.
 * @param root0.render Re-renders picker result UI.
 * @param root0.selectBook Selects a book from filtered options.
 * @param root0.state Mutable picker state.
 */
export function bindAfterBookPickerEvents({
  clearResults,
  refs,
  refreshFiltered,
  render,
  selectBook,
  state,
}: BindingArgs): void {
  refs.afterBookInput.addEventListener("focus", () => {
    refreshFiltered(false);
  });
  refs.afterBookInput.addEventListener("input", () => {
    refreshFiltered(true);
  });
  refs.afterBookInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.activeIndex = wrapIndex(
        state.activeIndex + 1,
        state.filtered.length,
      );
      render();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.activeIndex = wrapIndex(
        state.activeIndex - 1,
        state.filtered.length,
      );
      render();
      return;
    }
    if (event.key === "Enter" && state.activeIndex > NO_ACTIVE_INDEX) {
      event.preventDefault();
      selectBook(state.filtered[state.activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      clearResults();
      render();
      refs.afterBookInput.blur();
    }
  });
  refs.afterBookResults.addEventListener("mousemove", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    state.activeIndex = Number(target.dataset.resultIndex);
    render();
  });
  refs.afterBookResults.addEventListener("click", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    const resultIndex = Number(target.dataset.resultIndex);
    selectBook(state.filtered[resultIndex]);
  });
  document.addEventListener("click", (event: MouseEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    const keepOpen = shouldKeepPickerOpen({
      targetIsInResults: refs.afterBookResults.contains(event.target),
      targetIsInput: event.target === refs.afterBookInput,
    });
    if (keepOpen) {
      return;
    }
    clearResults();
    render();
  });
}
