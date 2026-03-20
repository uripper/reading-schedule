import type { CalendarRuntimeState } from "../../types/types.ts";

const MONTH_KEY_LENGTH = 7;

/**
 * Returns today's local day key in `YYYY-MM-DD` format.
 * @returns Local today key.
 */
export function todayDateKey(): string {
    const NOW = new Date();
    const YEAR = NOW.getFullYear();
    const MONTH = String(NOW.getMonth() + 1).padStart(2, "0");
    const DAY = String(NOW.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Extracts `YYYY-MM` month key from a day key.
 * @param dateKey - Day key in `YYYY-MM-DD` format.
 * @returns Month key in `YYYY-MM` format.
 */
export function monthKeyForDateKey(dateKey: string): string {
    return dateKey.slice(0, MONTH_KEY_LENGTH);
}

/**
 * Resolves best index for target month within available month list.
 * @param months - Available month keys.
 * @param targetMonthKey - Preferred month key.
 * @returns Matching/upcoming/fallback month index.
 */
export function indexForMonth(
    months: string[],
    targetMonthKey: string,
): number {
    const EXACT_INDEX = months.indexOf(targetMonthKey);
    if (EXACT_INDEX >= 0) {
        return EXACT_INDEX;
    }
    const UPCOMING_INDEX = months.findIndex((monthKey) => {
        return monthKey.localeCompare(targetMonthKey) >= 0;
    });
    if (UPCOMING_INDEX >= 0) {
        return UPCOMING_INDEX;
    }
    return Math.max(0, months.length - 1);
}

/**
 * Moves runtime state focus to today when month data is present.
 * @param state - Mutable calendar runtime state.
 */
export function applyTodayFocus(state: CalendarRuntimeState): void {
    const CALENDAR_STATE = state;
    if (!CALENDAR_STATE.months.length) {
        return;
    }
    const TODAY_KEY = todayDateKey();
    const TODAY_MONTH_KEY = monthKeyForDateKey(TODAY_KEY);
    CALENDAR_STATE.index = indexForMonth(
        CALENDAR_STATE.months,
        TODAY_MONTH_KEY,
    );
    CALENDAR_STATE.selectedDate = "";
    if (CALENDAR_STATE.months[CALENDAR_STATE.index] === TODAY_MONTH_KEY) {
        CALENDAR_STATE.selectedDate = TODAY_KEY;
    }
}

function focusSelectedDate(dateKey: string): void {
    const BUTTON = document.querySelector(`[data-calendar-day='${dateKey}']`);
    if (BUTTON instanceof HTMLElement) {
        BUTTON.focus();
    }
}

/**
 * Selects a date, refreshes month UI, and optionally focuses its day button.
 * @param state - Mutable calendar runtime state.
 * @param dateKey - Day key to select.
 * @param renderMonth - Callback to rerender calendar month.
 * @param options - Optional selection behavior.
 * @param focus - Whether to focus selected day button.
 */
export function selectDate(args: {
    dateKey: string;
    options?: { focus?: boolean };
    renderMonth: () => void;
    state: CalendarRuntimeState;
}): void {
    const CALENDAR_STATE = args.state;
    CALENDAR_STATE.selectedDate = args.dateKey;
    CALENDAR_STATE.expectedFinishHighlightDate = args.dateKey;
    args.renderMonth();
    if (args.options?.focus === true) {
        focusSelectedDate(args.dateKey);
    }
}

function boundedSelectionIndex(
    monthCellKeys: string[],
    currentIndex: number,
    delta: number,
): number {
    return Math.min(
        monthCellKeys.length - 1,
        Math.max(0, currentIndex + delta),
    );
}

/**
 * Moves day-cell selection by offset and focuses resulting day.
 * @param args - Selection movement inputs.
 */
export function moveSelectionBy(args: {
    currentIndex: number;
    delta: number;
    selectDateWithOptions: (
        dateKey: string,
        options?: { focus?: boolean },
    ) => void;
    state: CalendarRuntimeState;
}): void {
    const NEXT_INDEX = boundedSelectionIndex(
        args.state.monthCellKeys,
        args.currentIndex,
        args.delta,
    );
    const NEXT_KEY = args.state.monthCellKeys[NEXT_INDEX];
    if (!NEXT_KEY) {
        return;
    }
    args.selectDateWithOptions(NEXT_KEY, { focus: true });
}
