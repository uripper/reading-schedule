import { el } from "../dom.js";
import { dayKey, monthCells, monthLabel } from "./utils.js";
import { createDayButton, createWeekdayHeader } from "./month_day_button.js";
import { handleDayKeydown } from "./month_keyboard.js";

interface CalendarRow {
  title?: string;
  minutes?: number;
  finish?: boolean;
}

interface CalendarState {
  dates: Record<string, CalendarRow[]>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
}

interface MonthActions {
  selectDate(dateKey: string, options?: { focus?: boolean }): void;
  moveSelectionBy(delta: number, currentIndex: number): void;
  renderDetails(): void;
}

/**
 * Returns today's local day key for month rendering state checks.
 * @returns Day key in `YYYY-MM-DD` format.
 */
function todayDayKey(): string {
  return dayKey(new Date());
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

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", `Schedule for ${monthLabel(monthKey)}`);
  const todayKey = todayDayKey();

  cells.forEach((date, index) => {
    const keyForDay = calendarState.monthCellKeys[index];
    let rows: CalendarRow[] = [];
    if (keyForDay in calendarState.dates) {
      rows = calendarState.dates[keyForDay];
    }
    const dayButton = createDayButton({
      date,
      firstDate,
      keyForDay,
      rows,
      selectedDate: calendarState.selectedDate,
      todayKey,
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
