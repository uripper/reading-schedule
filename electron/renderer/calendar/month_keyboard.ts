import { CALENDAR_COLUMN_COUNT } from "./constants.js";

/**
 *
 * @param event
 * @param index
 * @param totalCellCount
 * @param moveSelectionBy
 */
export function handleDayKeydown(
  event: KeyboardEvent,
  index: number,
  totalCellCount: number,
  moveSelectionBy: (delta: number, currentIndex: number) => void,
): void {
  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveSelectionBy(1, index);
    return;
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveSelectionBy(-1, index);
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelectionBy(CALENDAR_COLUMN_COUNT, index);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelectionBy(-CALENDAR_COLUMN_COUNT, index);
    return;
  }
  if (event.key === "Home") {
    event.preventDefault();
    moveSelectionBy(-index, index);
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    moveSelectionBy(totalCellCount - index - 1, index);
  }
}
