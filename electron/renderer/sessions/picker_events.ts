import { clampIndex } from "./utils.js";
import type { PickerBook } from "./picker_results.js";
import type { SessionRefs } from "./refs.js";

type PickerKeydownArgs = {
  blurInput: () => void;
  filteredBooks: PickerBook[];
  hidePicker: () => void;
  pickerIndex: number;
  refreshPicker: () => void;
  renderPicker: () => void;
  selectBook: (book: PickerBook | null) => void;
  setPickerIndex: (index: number) => void;
};

export function handlePickerKeydown(
  event: KeyboardEvent,
  {
    filteredBooks,
    blurInput,
    hidePicker,
    pickerIndex,
    refreshPicker,
    renderPicker,
    selectBook,
    setPickerIndex,
  }: PickerKeydownArgs,
): void {
  if (event.key === "ArrowDown") {
    if (!filteredBooks.length) {
      refreshPicker();
    }
    if (!filteredBooks.length) {
      return;
    }
    event.preventDefault();
    setPickerIndex(clampIndex(pickerIndex + 1, filteredBooks.length));
    renderPicker();
    return;
  }
  if (event.key === "ArrowUp") {
    if (!filteredBooks.length) {
      return;
    }
    event.preventDefault();
    setPickerIndex(clampIndex(pickerIndex - 1, filteredBooks.length));
    renderPicker();
    return;
  }
  if (event.key === "Enter") {
    if (pickerIndex < 0 || !filteredBooks.length) {
      return;
    }
    event.preventDefault();
    selectBook(filteredBooks[pickerIndex]);
    return;
  }
  if (event.key === "Escape") {
    hidePicker();
    blurInput();
  }
}

export function shouldHidePickerOnDocumentClick(
  event: MouseEvent,
  refs: SessionRefs,
): boolean {
  if (!(event.target instanceof Node)) {
    return false;
  }
  if (event.target === refs.input || refs.results.contains(event.target)) {
    return false;
  }
  return true;
}
