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
 *
 */
function todayDayKey(): string {
  return dayKey(new Date());
}

/**
 *
 * @param state
 * @param root0
 * @param root0.selectDate
 * @param root0.moveSelectionBy
 * @param root0.renderDetails
 */
export function renderCalendarMonth(
  state: CalendarState,
  { selectDate, moveSelectionBy, renderDetails }: MonthActions,
): void {
  const monthKey = state.months[state.index];
  const calendar = el("calendar");
  if (!monthKey) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = "No schedule yet.";
    calendar.replaceChildren(empty);
    state.monthCellKeys = [];
    renderDetails();
    return;
  }

  const [year, month] = monthKey.split("-").map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const cells = monthCells(monthKey);
  state.monthCellKeys = cells.map((date) => dayKey(date));

  if (
    !state.selectedDate ||
    !state.monthCellKeys.includes(state.selectedDate)
  ) {
    const firstWithRows = state.monthCellKeys.find((cellKey) => {
      return (state.dates[cellKey] || []).length > 0;
    });
    state.selectedDate = firstWithRows || state.monthCellKeys[0] || "";
  }

  const grid = document.createElement("div");
  grid.className = "calendar-grid";
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", `Schedule for ${monthLabel(monthKey)}`);
  const todayKey = todayDayKey();

  cells.forEach((date, index) => {
    const keyForDay = state.monthCellKeys[index];
    const rows = state.dates[keyForDay] || [];
    const dayButton = createDayButton(
      date,
      firstDate,
      keyForDay,
      rows,
      state.selectedDate,
      todayKey,
    );
    dayButton.onclick = () => { selectDate(keyForDay); };
    dayButton.onkeydown = (event) => {
      handleDayKeydown(
        event,
        index,
        state.monthCellKeys.length,
        moveSelectionBy,
      );
    };
    grid.append(dayButton);
  });

  calendar.replaceChildren(...createWeekdayHeader(), grid);
  renderDetails();
}
