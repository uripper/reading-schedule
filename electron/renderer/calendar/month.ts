import { el } from "../dom.js";
import { dayKey, monthCells, monthLabel } from "./utils.js";
import { createDayButton, createWeekdayHeader } from "./month_day_button.js";
import { handleDayKeydown } from "./month_keyboard.js";
import type { CalendarRow, CalendarState, MonthActions } from "../../types/calendar/month.js";

/**
 * Returns today's local day key for month rendering state checks.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDayKey(): string {
  return dayKey(new Date());
}

/**
 * Adds finish rows for books completed on this date without scheduled sessions.
 * @param plannedRows Existing scheduled rows for the date.
 * @param completedBookRows Synthetic completed-book rows.
 * @returns Combined rows for month-grid display.
 */
export function mergeDisplayRows(
  plannedRows: CalendarRow[],
  completedBookRows: CalendarRow[],
): CalendarRow[] {
  const completedByBookId = new Map<string, CalendarRow>();
  completedBookRows.forEach((row) => {
    if (typeof row.book_id !== "string" || row.book_id === "") {
      return;
    }
    if (completedByBookId.has(row.book_id)) {
      return;
    }
    completedByBookId.set(row.book_id, row);
  });
  const out: CalendarRow[] = [];
  const seenBookIds = new Set<string>();
  plannedRows.forEach((row) => {
    if (typeof row.book_id !== "string" || row.book_id === "") {
      out.push(row);
      return;
    }
    if (completedByBookId.has(row.book_id)) {
      out.push({
        ...row,
        finish: true,
      });
      seenBookIds.add(row.book_id);
      return;
    }
    out.push(row);
    seenBookIds.add(row.book_id);
  });
  completedByBookId.forEach((row, bookId) => {
    if (seenBookIds.has(bookId)) {
      return;
    }
    seenBookIds.add(bookId);
    out.push(row);
  });
  const finishRows: CalendarRow[] = [];
  const otherRows: CalendarRow[] = [];
  out.forEach((row) => {
    if (row.finish === true) {
      finishRows.push(row);
      return;
    }
    otherRows.push(row);
  });
  return [...finishRows, ...otherRows];
}

/**
 * Ensures selected date is within current month cell range.
 * Defaults to first populated day, then first visible cell.
 * @param state Mutable calendar render state.
 */
function ensureSelectedDateInMonth(state: CalendarState): void {
  const calendarState = state;
  if (
    calendarState.selectedDate === "" ||
    !calendarState.monthCellKeys.includes(calendarState.selectedDate)
  ) {
    const firstWithRows = calendarState.monthCellKeys.find((cellKey) => {
      if (!(cellKey in calendarState.dates)) {
        return false;
      }
      return calendarState.dates[cellKey].length > 0;
    });
    calendarState.selectedDate = firstWithRows ?? calendarState.monthCellKeys[0];
  }
}

/**
 * Renders month grid, day buttons, and keyboard interactions.
 * @param state Calendar render state.
 * @param actions Month interaction callbacks.
 * @param actions.selectDate Date selection callback.
 * @param actions.moveSelectionBy Keyboard/grid movement callback.
 * @param actions.renderDetails Details rerender callback.
 */
export function renderCalendarMonth(
  state: CalendarState,
  actions: MonthActions,
): void {
  const calendarState = state;
  const moveSelectionBy = (delta: number, currentIndex: number): void => {
    actions.moveSelectionBy(delta, currentIndex);
  };
  const monthKey = calendarState.months[calendarState.index];
  const calendar = el("calendar");
  if (!monthKey) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No schedule yet.";
    calendar.replaceChildren(empty);
    calendarState.monthCellKeys = [];
    actions.renderDetails();
    return;
  }

  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const cells = monthCells(monthKey);
  calendarState.monthCellKeys = cells.map((date) => dayKey(date));
  ensureSelectedDateInMonth(calendarState);

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", `Schedule for ${monthLabel(monthKey)}`);
  const todayKey = todayDayKey();

  cells.forEach((date, index) => {
    const keyForDay = calendarState.monthCellKeys[index];
    const completedBookRows = actions.completedBookRowsForDate(keyForDay);
    let rows: CalendarRow[] = [];
    if (keyForDay in calendarState.dates) {
      rows = calendarState.dates[keyForDay];
    }
    const displayRows = mergeDisplayRows(rows, completedBookRows);
    const dayButton = createDayButton({
      date,
      firstDate,
      keyForDay,
      todayKey,
      rows: displayRows,
      selectedDate: calendarState.selectedDate,
    });
    dayButton.onclick = () => {
      actions.selectDate(keyForDay);
    };
    dayButton.onkeydown = (event) => {
      handleDayKeydown(
        event,
        index,
        calendarState.monthCellKeys.length,
        moveSelectionBy,
      );
    };
    grid.append(dayButton);
  });

  calendar.replaceChildren(...createWeekdayHeader(), grid);
  actions.renderDetails();
}
