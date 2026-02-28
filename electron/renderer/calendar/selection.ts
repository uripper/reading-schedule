import type { CalendarRuntimeState } from "../../types/types.js";

const MONTH_KEY_LENGTH = 7;

/**
 * Returns today's local day key in `YYYY-MM-DD` format.
 * @returns Local today key.
 */
export function todayDateKey(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Extracts `YYYY-MM` month key from a day key.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 * @returns Month key in `YYYY-MM` format.
 */
export function monthKeyForDateKey(dateKey: string): string {
	return dateKey.slice(0, MONTH_KEY_LENGTH);
}

/**
 * Resolves best index for target month within available month list.
 * @param months Available month keys.
 * @param targetMonthKey Preferred month key.
 * @returns Matching/upcoming/fallback month index.
 */
export function indexForMonth(
	months: string[],
	targetMonthKey: string,
): number {
	const exactIndex = months.indexOf(targetMonthKey);
	if (exactIndex >= 0) {
		return exactIndex;
	}
	const upcomingIndex = months.findIndex((monthKey) => {
		return monthKey.localeCompare(targetMonthKey) >= 0;
	});
	if (upcomingIndex >= 0) {
		return upcomingIndex;
	}
	return Math.max(0, months.length - 1);
}

/**
 * Moves runtime state focus to today when month data is present.
 * @param state Mutable calendar runtime state.
 */
export function applyTodayFocus(state: CalendarRuntimeState): void {
	const calendarState = state;
	if (!calendarState.months.length) {
		return;
	}
	const todayKey = todayDateKey();
	const todayMonthKey = monthKeyForDateKey(todayKey);
	calendarState.index = indexForMonth(calendarState.months, todayMonthKey);
	calendarState.selectedDate = "";
	if (calendarState.months[calendarState.index] === todayMonthKey) {
		calendarState.selectedDate = todayKey;
	}
}

/**
 * Selects a date, refreshes month UI, and optionally focuses its day button.
 * @param state Mutable calendar runtime state.
 * @param dateKey Day key to select.
 * @param renderMonth Callback to rerender calendar month.
 * @param options Optional selection behavior.
 * @param options.focus Whether to focus selected day button.
 */
export function selectDate(
	state: CalendarRuntimeState,
	dateKey: string,
	renderMonth: () => void,
	options: { focus?: boolean } = {},
): void {
	const calendarState = state;
	calendarState.selectedDate = dateKey;
	calendarState.expectedFinishHighlightDate = dateKey;
	renderMonth();
	if (options.focus === true) {
		const button = document.querySelector(`[data-calendar-day='${dateKey}']`);
		if (button instanceof HTMLElement) {
			button.focus();
		}
	}
}

/**
 * Moves day-cell selection by offset and focuses resulting day.
 * @param state Mutable calendar runtime state.
 * @param delta Positive/negative index delta.
 * @param currentIndex Current cell index.
 * @param selectDateWithOptions Date selection callback with focus option.
 */
export function moveSelectionBy(
	state: CalendarRuntimeState,
	delta: number,
	currentIndex: number,
	selectDateWithOptions: (
		dateKey: string,
		options?: { focus?: boolean },
	) => void,
): void {
	const nextIndex = Math.min(
		state.monthCellKeys.length - 1,
		Math.max(0, currentIndex + delta),
	);
	const nextKey = state.monthCellKeys[nextIndex];
	if (!nextKey) {
		return;
	}
	selectDateWithOptions(nextKey, { focus: true });
}
