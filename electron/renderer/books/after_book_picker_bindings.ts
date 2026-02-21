import type { BookFormRefs } from "./form_refs.js";
import { lookupResultTarget, wrapIndex } from "./after_book_picker_helpers.js";
import type { Book } from "./types.js";
import type { PickerState } from "./after_book_picker_render.js";
import { NO_ACTIVE_INDEX } from "./after_book_picker_render.js";

type BindingArgs = {
  clearResults: () => void;
  refs: BookFormRefs;
  refreshFiltered: (clearChangedSelection: boolean) => void;
  render: () => void;
  selectBook: (book: Book | null | undefined) => void;
  state: PickerState;
};

export function bindAfterBookPickerEvents({
  clearResults,
  refs,
  refreshFiltered,
  render,
  selectBook,
  state,
}: BindingArgs): void {
  refs.afterBookInput.addEventListener("focus", () => refreshFiltered(false));
  refs.afterBookInput.addEventListener("input", () => refreshFiltered(true));
  refs.afterBookInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.activeIndex = wrapIndex(state.activeIndex + 1, state.filtered.length);
      render();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      state.activeIndex = wrapIndex(state.activeIndex - 1, state.filtered.length);
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
    if (
      event.target === refs.afterBookInput ||
      refs.afterBookResults.contains(event.target)
    ) {
      return;
    }
    clearResults();
    render();
  });
}
