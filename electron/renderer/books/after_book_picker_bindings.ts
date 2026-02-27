
import { lookupResultTarget, shouldKeepPickerOpen, wrapIndex } from "./after_book_picker_helpers.js";

import { NO_ACTIVE_INDEX } from "./after_book_picker_render.js";
import type { BindingArgs } from "../../types/books/after_book_picker_bindings.js";

/**
 * Binds keyboard/mouse/document events for after-book picker interactions.
 * @param args Event-binding dependencies and state hooks.
 * @param args.clearResults Clears currently filtered picker results.
 * @param args.refs Form references containing picker controls.
 * @param args.refreshFiltered Rebuilds filtered picker options from input text.
 * @param args.render Re-renders picker result UI.
 * @param args.selectBook Selects a book from filtered options.
 * @param args.state Mutable picker state.
 */
export function bindAfterBookPickerEvents(args: BindingArgs): void {
  const pickerState = args.state;
  args.refs.afterBookInput.addEventListener("focus", () => {
    args.refreshFiltered(false);
  });
  args.refs.afterBookInput.addEventListener("input", () => {
    args.refreshFiltered(true);
  });
  args.refs.afterBookInput.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      pickerState.activeIndex = wrapIndex(
        pickerState.activeIndex + 1,
        pickerState.filtered.length,
      );
      args.render();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      pickerState.activeIndex = wrapIndex(
        pickerState.activeIndex - 1,
        pickerState.filtered.length,
      );
      args.render();
      return;
    }
    if (event.key === "Enter" && pickerState.activeIndex > NO_ACTIVE_INDEX) {
      event.preventDefault();
      args.selectBook(pickerState.filtered[pickerState.activeIndex]);
      return;
    }
    if (event.key === "Escape") {
      args.clearResults();
      args.render();
      args.refs.afterBookInput.blur();
    }
  });
  args.refs.afterBookResults.addEventListener("mousemove", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    pickerState.activeIndex = Number(target.dataset.resultIndex);
    args.render();
  });
  args.refs.afterBookResults.addEventListener("click", (event: MouseEvent) => {
    const target = lookupResultTarget(event);
    if (!target) {
      return;
    }
    const resultIndex = Number(target.dataset.resultIndex);
    args.selectBook(pickerState.filtered[resultIndex]);
  });
  document.addEventListener("click", (event: MouseEvent) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    const keepOpen = shouldKeepPickerOpen({
      targetIsInResults: args.refs.afterBookResults.contains(event.target),
      targetIsInput: event.target === args.refs.afterBookInput,
    });
    if (keepOpen) {
      return;
    }
    args.clearResults();
    args.render();
  });
}
