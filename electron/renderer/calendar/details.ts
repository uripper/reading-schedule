import { el } from '../dom.js';
import { rowsWithFinishFirst, type CalendarRowWithFinish } from './data.js';
import {
  buildFutureSessionItem,
  buildPastSessionItem,
  buildTodaySessionItem,
  dayMode,
  type DetailInteractionHandlers,
  rowsWithCompletedLast,
} from './details_helpers.js';
import { dateHeading } from './utils.js';

type CalendarDayMode = 'past' | 'today' | 'future';

type CalendarState = {
  selectedDate: string;
  dates: Record<string, CalendarRowWithFinish[]>;
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
  expectedFinishHighlightDate: string;
};

function emptyMessageForMode(mode: CalendarDayMode): string {
  if (mode === 'past') {
    return 'No sessions planned for this day.';
  }
  return 'No sessions planned for this day.';
}

function rowsForMode(
  rows: CalendarRowWithFinish[],
  mode: CalendarDayMode,
  interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
  if (mode === 'past') {
    return rowsWithCompletedLast(rows, interactionHandlers);
  }
  if (mode === 'today') {
    return rowsWithCompletedLast(rows, interactionHandlers);
  }
  return rowsWithFinishFirst(rows);
}

function rowNodeForMode(
  mode: CalendarDayMode,
  row: CalendarRowWithFinish,
  state: CalendarState,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  if (mode === 'today') {
    return buildTodaySessionItem(row, interactionHandlers, rerenderDetails);
  }
  if (mode === 'future') {
    return buildFutureSessionItem(row, state, interactionHandlers);
  }
  return buildPastSessionItem(row, interactionHandlers, rerenderDetails);
}

export function renderCalendarDetails(
  state: CalendarState,
  interactionHandlers: DetailInteractionHandlers,
  onRerenderRequested: (() => void) | null = null,
): void {
  const details = el('calendarDayDetails');
  const key = state.selectedDate;
  const rows = state.dates[key] || [];

  const title = document.createElement('h2');
  title.textContent = 'Selected Day';
  if (key) {
    title.textContent = dateHeading(key);
  }

  if (!key) {
    const hint = document.createElement('p');
    hint.className = 'hint-text';
    hint.textContent = 'Select a day in the schedule grid to view details.';
    details.replaceChildren(title, hint);
    state.expectedFinishHighlightDate = '';
    return;
  }

  const mode = dayMode(key);
  const rowsToRender = rowsForMode(rows, mode, interactionHandlers);
  if (!rowsToRender.length) {
    const empty = document.createElement('p');
    empty.className = 'hint-text';
    empty.textContent = emptyMessageForMode(mode);
    details.replaceChildren(title, empty);
    state.expectedFinishHighlightDate = '';
    return;
  }

  const list = document.createElement('div');
  list.className = 'day-details-list';
  const animateFinishRows = state.expectedFinishHighlightDate === key;
  const rerenderDetails = () => {
    if (onRerenderRequested) {
      onRerenderRequested();
      return;
    }
    renderCalendarDetails(state, interactionHandlers, onRerenderRequested);
  };

  rowsToRender.forEach((row) => {
    const node = rowNodeForMode(mode, row, state, interactionHandlers, rerenderDetails);
    if (animateFinishRows && row.finish) {
      node.classList.add('is-finish-pulse');
    }
    list.append(node);
  });

  details.replaceChildren(title, list);
  state.expectedFinishHighlightDate = '';
}
