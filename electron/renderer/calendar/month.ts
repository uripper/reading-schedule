import { el } from "../dom.js";
import { dayKey, monthCells, monthLabel, sessionKeyFor } from "./utils.js";
import { createDayButton, createWeekdayHeader } from "./month_day_button.js";
import { handleDayKeydown } from "./month_keyboard.js";

interface CalendarRow {
  book_id?: string;
  date?: string;
  session_index?: string | number;
  completed?: boolean;
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
  isSessionCompleted(sessionKey: string): boolean;
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
 * Determines whether a row should be marked complete in month cells.
 * @param row Calendar row to inspect.
 * @param todayKey Today's date key.
 * @param isSessionCompleted Completion checker by session key.
 * @returns True when row is complete and not scheduled in the future.
 */
function rowIsComplete(
  row: CalendarRow,
  todayKey: string,
  isSessionCompleted: (sessionKey: string) => boolean,
): boolean {
  if (typeof row.date !== "string" || row.date === "") {
    return false;
  }
  if (row.date > todayKey) {
    return false;
  }
  if (typeof row.book_id !== "string" || row.book_id === "") {
    return false;
  }
  if (row.session_index === undefined || row.session_index === null) {
    return false;
  }
  return isSessionCompleted(
    sessionKeyFor({
      book_id: row.book_id,
      date: row.date,
      session_index: row.session_index,
    }),
  );
}

/**
 * Adds completion metadata used by month-day cell and chip rendering.
 * @param rows Calendar rows for one day.
 * @param todayKey Today's date key.
 * @param isSessionCompleted Completion checker by session key.
 * @returns Rows copied with completion flags.
 */
export function rowsWithCompletionState(
  rows: CalendarRow[],
  todayKey: string,
  isSessionCompleted: (sessionKey: string) => boolean,
): CalendarRow[] {
  return rows.map((row) => {
    return {
      ...row,
      completed: rowIsComplete(row, todayKey, isSessionCompleted),
    };
  });
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
    const rowsWithCompletion = rowsWithCompletionState(
      rows,
      todayKey,
      actions.isSessionCompleted,
    );
    const dayButton = createDayButton({
      date,
      firstDate,
      keyForDay,
      rows: rowsWithCompletion,
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
