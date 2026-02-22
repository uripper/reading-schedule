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
 *
 * @param root0
 * @param root0.clearResults
 * @param root0.refs
 * @param root0.refreshFiltered
 * @param root0.render
 * @param root0.selectBook
 * @param root0.state
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
