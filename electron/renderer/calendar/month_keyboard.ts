import { CALENDAR_COLUMN_COUNT } from "./constants.ts";

/**
 * Handles keyboard navigation for month grid day buttons.
 * @param event - Keyboard event from day button.
 * @param index - Current day-cell index.
 * @param totalCellCount - Total number of day cells.
 * @param moveSelectionBy - Callback to move selection by cell delta.
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
