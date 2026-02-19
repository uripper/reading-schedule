import { el } from '../dom.js';
import { CALENDAR_COLUMN_COUNT, WEEKDAY_LABELS } from './constants.js';
import { dayKey, monthCells, monthLabel } from './utils.js';

type CalendarRow = {
  title?: string;
  minutes?: number;
  finish?: boolean;
};

type CalendarState = {
  dates: Record<string, CalendarRow[]>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
};

type MonthActions = {
  selectDate: (dateKey: string, options?: { focus?: boolean }) => void;
  moveSelectionBy: (delta: number, currentIndex: number) => void;
  renderDetails: () => void;
};

function todayDayKey(): string {
  return dayKey(new Date());
}

function createWeekdayHeader(): HTMLSpanElement[] {
  return WEEKDAY_LABELS.map((label) => {
    const head = document.createElement('span');
    head.className = 'calendar-weekday';
    head.textContent = label;
    return head;
  });
}

function createDayButton(
  date: Date,
  firstDate: Date,
  keyForDay: string,
  rows: CalendarRow[],
  selectedDate: string,
  todayKey: string,
): HTMLButtonElement {
  const dayButton = document.createElement('button');
  dayButton.type = 'button';
  dayButton.className = 'day';
  if (date.getMonth() !== firstDate.getMonth()) {
    dayButton.className = 'day is-muted';
  }
  if (selectedDate === keyForDay) {
    dayButton.classList.add('is-selected');
  }
  if (keyForDay < todayKey) {
    dayButton.classList.add('is-past');
  }

  dayButton.dataset.calendarDay = keyForDay;
  dayButton.setAttribute('role', 'gridcell');
  dayButton.setAttribute('aria-selected', 'false');
  if (selectedDate === keyForDay) {
    dayButton.setAttribute('aria-selected', 'true');
  }

  const dayDate = document.createElement('span');
  dayDate.className = 'day-date';
  dayDate.textContent = String(date.getDate());

  const count = document.createElement('span');
  count.className = 'day-event-count';
  count.textContent = 'No sessions';
  if (rows.length) {
    count.textContent = `${rows.length} planned`;
  }

  dayButton.append(dayDate, count);
  rows.slice(0, 2).forEach((row) => {
    const chip = document.createElement('span');
    chip.className = 'day-chip';
    if (row.finish) {
      chip.className = 'day-chip finish';
    }
    chip.textContent = `${row.title || 'Untitled'} - ${Number(row.minutes || 0)}m`;
    dayButton.append(chip);
  });

  if (rows.length > 2) {
    const extra = document.createElement('span');
    extra.className = 'day-chip is-more';
    extra.textContent = `+${rows.length - 2} more`;
    dayButton.append(extra);
  }

  return dayButton;
}

function handleDayKeydown(
  event: KeyboardEvent,
  index: number,
  totalCellCount: number,
  moveSelectionBy: (delta: number, currentIndex: number) => void,
): void {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    moveSelectionBy(1, index);
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    moveSelectionBy(-1, index);
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveSelectionBy(CALENDAR_COLUMN_COUNT, index);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveSelectionBy(-CALENDAR_COLUMN_COUNT, index);
    return;
  }
  if (event.key === 'Home') {
    event.preventDefault();
    moveSelectionBy(-index, index);
    return;
  }
  if (event.key === 'End') {
    event.preventDefault();
    moveSelectionBy(totalCellCount - index - 1, index);
  }
}

export function renderCalendarMonth(state: CalendarState, { selectDate, moveSelectionBy, renderDetails }: MonthActions): void {
  const monthKey = state.months[state.index];
  const calendar = el('calendar');
  if (!monthKey) {
    const empty = document.createElement('p');
    empty.className = 'hint-text';
    empty.textContent = 'No schedule yet.';
    calendar.replaceChildren(empty);
    state.monthCellKeys = [];
    renderDetails();
    return;
  }

  const [year, month] = monthKey.split('-').map(Number);
  const firstDate = new Date(year, month - 1, 1);
  const cells = monthCells(monthKey);
  state.monthCellKeys = cells.map((date) => dayKey(date));

  if (!state.selectedDate || !state.monthCellKeys.includes(state.selectedDate)) {
    const firstWithRows = state.monthCellKeys.find((cellKey) => {
      return (state.dates[cellKey] || []).length > 0;
    });
    state.selectedDate = firstWithRows || state.monthCellKeys[0] || '';
  }

  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', `Schedule for ${monthLabel(monthKey)}`);
  const todayKey = todayDayKey();

  cells.forEach((date, index) => {
    const keyForDay = state.monthCellKeys[index];
    const rows = state.dates[keyForDay] || [];
    const dayButton = createDayButton(date, firstDate, keyForDay, rows, state.selectedDate, todayKey);
    dayButton.onclick = () => selectDate(keyForDay);
    dayButton.onkeydown = (event) => {
      handleDayKeydown(event, index, state.monthCellKeys.length, moveSelectionBy);
    };
    grid.append(dayButton);
  });

  calendar.replaceChildren(...createWeekdayHeader(), grid);
  renderDetails();
}
