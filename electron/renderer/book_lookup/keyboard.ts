
import type { BookLookupItem } from '../app/types.js';

type SetActiveIndex = (index: number) => void;
type SelectItem = (index: number) => void;

function handleArrowDown(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
): boolean {
  if (event.key !== 'ArrowDown') {
    return false;
  }
  event.preventDefault();
  if (!currentItems.length) {
    return true;
  }
  if (activeIndex < 0) {
    setActiveIndex(0);
    return true;
  }
  setActiveIndex(activeIndex + 1);
  return true;
}

function handleArrowUp(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
): boolean {
  if (event.key !== 'ArrowUp') {
    return false;
  }
  event.preventDefault();
  if (!currentItems.length) {
    return true;
  }
  if (activeIndex < 0) {
    setActiveIndex(currentItems.length - 1);
    return true;
  }
  setActiveIndex(activeIndex - 1);
  return true;
}

function handleEnter(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  selectItem: SelectItem,
): boolean {
  if (event.key !== 'Enter') {
    return false;
  }
  if (activeIndex < 0 || !currentItems.length) {
    return true;
  }
  event.preventDefault();
  selectItem(activeIndex);
  return true;
}

function handleEscape(event: KeyboardEvent, clearResults: () => void, searchInput: HTMLInputElement): boolean {
  if (event.key !== 'Escape') {
    return false;
  }
  clearResults();
  searchInput.blur();
  return true;
}

export function handleLookupKeydown(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
  selectItem: SelectItem,
  clearResults: () => void,
  searchInput: HTMLInputElement,
): void {
  if (handleArrowDown(event, currentItems, activeIndex, setActiveIndex)) {
    return;
  }

  if (handleArrowUp(event, currentItems, activeIndex, setActiveIndex)) {
    return;
  }

  if (handleEnter(event, currentItems, activeIndex, selectItem)) {
    return;
  }

  handleEscape(event, clearResults, searchInput);
}
