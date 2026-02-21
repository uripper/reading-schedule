import { WEEKDAY_LABELS } from "./constants.js";

type CalendarRow = {
  finish?: boolean;
  minutes?: number;
  title?: string;
};

type DayStyleFlags = {
  hasFinishRow: boolean;
  isMuted: boolean;
  isPast: boolean;
  isSelected: boolean;
  isToday: boolean;
};

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

export function createWeekdayHeader(): HTMLSpanElement[] {
  return WEEKDAY_LABELS.map((label) => {
    const head = document.createElement("span");
    head.className = "calendar-weekday";
    head.textContent = label;
    return head;
  });
}

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
  const count = document.createElement("span");
  count.className = "day-event-count";
  count.textContent = "No sessions";
  if (rows.length) {
    count.textContent = `${rows.length} planned`;
  }
  dayButton.append(dayDate, count);
  rows.slice(0, 2).forEach((row) => {
    const chip = document.createElement("span");
    chip.className = "day-chip";
    if (row.finish) {
      chip.className = "day-chip finish";
    }
    chip.textContent = `${row.title || "Untitled"} - ${Number(row.minutes || 0)}m`;
    dayButton.append(chip);
  });
  if (rows.length > 2) {
    const extra = document.createElement("span");
    extra.className = "day-chip is-more";
    extra.textContent = `+${rows.length - 2} more`;
    dayButton.append(extra);
  }
  return dayButton;
}
