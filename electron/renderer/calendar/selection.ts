import type { CalendarRuntimeState } from "./state_runtime.js";

const MONTH_KEY_LENGTH = 7;

/**
 *
 */
export function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 *
 * @param dateKey
 */
export function monthKeyForDateKey(dateKey: string): string {
  return dateKey.slice(0, MONTH_KEY_LENGTH);
}

/**
 *
 * @param months
 * @param targetMonthKey
 */
export function indexForMonth(months: string[], targetMonthKey: string): number {
  const exactIndex = months.indexOf(targetMonthKey);
  if (exactIndex >= 0) {
    return exactIndex;
  }
  const upcomingIndex = months.findIndex((monthKey) => {
    return Number(monthKey) >= Number(targetMonthKey);
  });
  if (upcomingIndex >= 0) {
    return upcomingIndex;
  }
  return Math.max(0, months.length - 1);
}

/**
 *
 * @param state
 */
export function applyTodayFocus(state: CalendarRuntimeState): void {
  if (!state.months.length) {
    return;
  }
  const todayKey = todayDateKey();
  const todayMonthKey = monthKeyForDateKey(todayKey);
  state.index = indexForMonth(state.months, todayMonthKey);
  state.selectedDate = "";
  if (state.months[state.index] === todayMonthKey) {
    state.selectedDate = todayKey;
  }
}

/**
 *
 * @param state
 * @param dateKey
 * @param renderMonth
 * @param options
 * @param options.focus
 */
export function selectDate(
  state: CalendarRuntimeState,
  dateKey: string,
  renderMonth: () => void,
  options: { focus?: boolean } = {},
): void {
  state.selectedDate = dateKey;
  state.expectedFinishHighlightDate = dateKey;
  renderMonth();
  if (options.focus) {
    const button = document.querySelector(`[data-calendar-day='${dateKey}']`);
    if (button instanceof HTMLElement) {
      button.focus();
    }
  }
}

/**
 *
 * @param state
 * @param delta
 * @param currentIndex
 * @param selectDateWithOptions
 */
export function moveSelectionBy(
  state: CalendarRuntimeState,
  delta: number,
  currentIndex: number,
  selectDateWithOptions: (dateKey: string, options?: { focus?: boolean }) => void,
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
