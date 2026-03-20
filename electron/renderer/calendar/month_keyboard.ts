import { CALENDAR_COLUMN_COUNT } from "./constants.ts";

type HandleDayKeydownArgs = {
    event: KeyboardEvent;
    index: number;
    totalCellCount: number;
    moveSelectionBy: (delta: number, currentIndex: number) => void;
};

const DIRECTIONAL_KEY_DELTAS: Record<string, number> = {
    ArrowDown: CALENDAR_COLUMN_COUNT,
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -CALENDAR_COLUMN_COUNT,
};

function edgeKeyDelta(
    index: number,
    key: string,
    totalCellCount: number,
): number | null {
    if (key === "Home") {
        return -index;
    }
    if (key === "End") {
        return totalCellCount - index - 1;
    }
    return null;
}

function keyboardDelta(
    index: number,
    key: string,
    totalCellCount: number,
): number | null {
    const DIRECTIONAL_DELTA = DIRECTIONAL_KEY_DELTAS[key];
    if (typeof DIRECTIONAL_DELTA === "number") {
        return DIRECTIONAL_DELTA;
    }
    return edgeKeyDelta(index, key, totalCellCount);
}

/**
 * Handles keyboard navigation for month grid day buttons.
 * @param args - Keyboard navigation inputs for the current day button.
 */
export function handleDayKeydown(args: HandleDayKeydownArgs): void {
    const DELTA = keyboardDelta(
        args.index,
        args.event.key,
        args.totalCellCount,
    );
    if (DELTA === null) {
        return;
    }
    args.event.preventDefault();
    args.moveSelectionBy(DELTA, args.index);
}
