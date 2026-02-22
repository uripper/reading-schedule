import type { BookLookupItem } from "../app/types.js";

type SetActiveIndex = (index: number) => void;
type SelectItem = (index: number) => void;

/**
 *
 * @param event
 * @param currentItems
 * @param activeIndex
 * @param setActiveIndex
 */
function handleArrowDown(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
): void {
  event.preventDefault();
  if (!currentItems.length) {
    return;
  }
  if (activeIndex < 0) {
    setActiveIndex(0);
    return;
  }
  setActiveIndex(activeIndex + 1);
}

/**
 *
 * @param event
 * @param currentItems
 * @param activeIndex
 * @param setActiveIndex
 */
function handleArrowUp(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
): void {
  event.preventDefault();
  if (!currentItems.length) {
    return;
  }
  if (activeIndex < 0) {
    setActiveIndex(currentItems.length - 1);
    return;
  }
  setActiveIndex(activeIndex - 1);
}

/**
 *
 * @param event
 * @param currentItems
 * @param activeIndex
 * @param selectItem
 */
function handleEnter(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  selectItem: SelectItem,
): void {
  if (activeIndex < 0 || !currentItems.length) {
    return;
  }
  event.preventDefault();
  selectItem(activeIndex);
}

/**
 *
 * @param clearResults
 * @param searchInput
 */
function handleEscape(
  clearResults: () => void,
  searchInput: HTMLInputElement,
): void {
  clearResults();
  searchInput.blur();
}

/**
 *
 * @param event
 * @param currentItems
 * @param activeIndex
 * @param setActiveIndex
 * @param selectItem
 * @param clearResults
 * @param searchInput
 */
export function handleLookupKeydown(
  event: KeyboardEvent,
  currentItems: readonly BookLookupItem[],
  activeIndex: number,
  setActiveIndex: SetActiveIndex,
  selectItem: SelectItem,
  clearResults: () => void,
  searchInput: HTMLInputElement,
): void {
  switch (event.key) {
    case "ArrowDown":
      handleArrowDown(event, currentItems, activeIndex, setActiveIndex);
      return;
    case "ArrowUp":
      handleArrowUp(event, currentItems, activeIndex, setActiveIndex);
      return;
    case "Enter":
      handleEnter(event, currentItems, activeIndex, selectItem);
      return;
    case "Escape":
      handleEscape(clearResults, searchInput);
      
    default:
      
  }
}
