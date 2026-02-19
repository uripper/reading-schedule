import { el } from "../dom.js";
import { dateHeading } from "./utils.js";
import {
  buildFutureSessionItem,
  buildPastSessionItem,
  buildTodaySessionItem,
  completedRows,
  dayMode,
  rowsWithCompletedLast,
} from "./details_helpers.js";

type CalendarDayMode = "past" | "today" | "future";

interface CalendarRow {
  [key: string]: unknown;
}

interface CalendarState {
  selectedDate: string;
  dates: Record<string, CalendarRow[]>;
}

interface InteractionHandlers {
  [key: string]: unknown;
}

function emptyMessageForMode(mode: CalendarDayMode): string {
  if (mode === "past") {
    return "No completed sessions logged for this day.";
  }
  return "No sessions planned for this day.";
}

function rowsForMode(
  rows: CalendarRow[],
  mode: CalendarDayMode,
  interactionHandlers: InteractionHandlers,
): CalendarRow[] {
  if (mode === "past") {
    return completedRows(rows, interactionHandlers);
  }
  if (mode === "today") {
    return rowsWithCompletedLast(rows, interactionHandlers);
  }
  return rows;
}

function rowNodeForMode(
  mode: CalendarDayMode,
  row: CalendarRow,
  state: CalendarState,
  interactionHandlers: InteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  if (mode === "today") {
    return buildTodaySessionItem(row, interactionHandlers, rerenderDetails);
  }
  if (mode === "future") {
    return buildFutureSessionItem(row, state, interactionHandlers);
  }
  return buildPastSessionItem(row);
}

export function renderCalendarDetails(
  state: CalendarState,
  interactionHandlers: InteractionHandlers,
): void {
  const details = el("calendarDayDetails");
  const key = state.selectedDate;
  const rows = state.dates[key] || [];

  const title = document.createElement("h2");
  title.textContent = "Selected Day";
  if (key) {
    title.textContent = dateHeading(key);
  }

  if (!key) {
    const hint = document.createElement("p");
    hint.className = "hint-text";
    hint.textContent = "Select a day in the schedule grid to view details.";
    details.replaceChildren(title, hint);
    return;
  }

  const mode = dayMode(key);
  const rowsToRender = rowsForMode(rows, mode, interactionHandlers);
  if (!rowsToRender.length) {
    const empty = document.createElement("p");
    empty.className = "hint-text";
    empty.textContent = emptyMessageForMode(mode);
    details.replaceChildren(title, empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "day-details-list";
  const rerenderDetails = () => {
    renderCalendarDetails(state, interactionHandlers);
  };

  rowsToRender.forEach((row) => {
    const node = rowNodeForMode(mode, row, state, interactionHandlers, rerenderDetails);
    list.append(node);
  });

  details.replaceChildren(title, list);
}
