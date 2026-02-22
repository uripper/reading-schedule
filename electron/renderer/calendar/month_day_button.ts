import { WEEKDAY_LABELS } from "./constants.js";
import { appendDayButtonSummary } from "./month_day_button_chips.js";

interface CalendarRow {
  finish?: boolean;
  minutes?: number;
  title?: string;
}

interface DayStyleFlags {
  hasFinishRow: boolean;
  isMuted: boolean;
  isPast: boolean;
  isSelected: boolean;
  isToday: boolean;
}

/**
 * Derives visual state flags for a calendar day button.
 * @param date Cell date.
 * @param firstDate First date of displayed month.
 * @param keyForDay Day key for the cell.
 * @param selectedDate Currently selected day key.
 * @param todayKey Today's day key.
 * @param rows Rows scheduled for the day.
 * @returns Day-style flags used for class/aria assignment.
 */
export function dayStyleFlags(
  date: Date,
  firstDate: Date,
  keyForDay: string,
  selectedDate: string,
  todayKey: string,
  rows: CalendarRow[],
): DayStyleFlags {
  const hasFinishRow = rows.some((row) => Boolean(row.finish));
  const isMuted = date.getMonth() !== firstDate.getMonth();
  const isSelected = selectedDate === keyForDay;
  const isPast = keyForDay < todayKey;
  const isToday = keyForDay === todayKey;
  return {
    hasFinishRow,
    isMuted,
    isPast,
    isSelected,
    isToday,
  };
}

/**
 * Builds weekday header labels for calendar grid.
 * @returns Weekday header span elements.
 */
export function createWeekdayHeader(): HTMLSpanElement[] {
  return WEEKDAY_LABELS.map((label) => {
    const head = document.createElement("span");
    head.className = "calendar-weekday";
    head.textContent = label;
    return head;
  });
}

/**
 * Creates one interactive day button with row summary chips and aria state.
 * @param date Cell date.
 * @param firstDate First date of displayed month.
 * @param keyForDay Day key for the cell.
 * @param rows Rows scheduled for the day.
 * @param selectedDate Currently selected day key.
 * @param todayKey Today's day key.
 * @returns Configured day button element.
 */
export function createDayButton(
  date: Date,
  firstDate: Date,
  keyForDay: string,
  rows: CalendarRow[],
  selectedDate: string,
  todayKey: string,
): HTMLButtonElement {
  const dayButton = document.createElement("button");
  dayButton.type = "button";
  dayButton.className = "day";
  const flags = dayStyleFlags(
    date,
    firstDate,
    keyForDay,
    selectedDate,
    todayKey,
    rows,
  );
  if (flags.hasFinishRow) {
    dayButton.classList.add("has-finish");
  }
  if (flags.isMuted) {
    dayButton.classList.add("is-muted");
  }
  if (flags.isSelected) {
    dayButton.classList.add("is-selected");
  }
  if (flags.isPast) {
    dayButton.classList.add("is-past");
  }
  if (flags.isToday) {
    dayButton.classList.add("is-today");
    dayButton.setAttribute("aria-current", "date");
  }
  dayButton.dataset.calendarDay = keyForDay;
  dayButton.setAttribute("role", "gridcell");
  dayButton.setAttribute("aria-selected", "false");
  if (flags.isSelected) {
    dayButton.setAttribute("aria-selected", "true");
  }
  const dayDate = document.createElement("span");
  dayDate.className = "day-date";
  dayDate.textContent = String(date.getDate());
  dayButton.append(dayDate);
  appendDayButtonSummary(dayButton, rows);
  return dayButton;
}
