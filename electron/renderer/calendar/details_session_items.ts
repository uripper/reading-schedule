import type { CalendarRowWithFinish } from './data.js';
import { estimateProgressLabel } from './estimates.js';
import { sessionKeyFor } from './utils.js';
import { progressFormForToday } from './details_progress_form.js';
import { fallbackBookForRow } from './details_fallback_book.js';
import type { CalendarStateSubset, DetailInteractionHandlers } from './details_types.js';

const DAY_DETAILS_META_CLASS = 'day-details-meta';
const COMPLETE_ITEM_CLASS = 'is-complete';
const COMPLETE_TOGGLE_LABEL = ' Complete session';
const COMPLETED_TEXT = 'Completed';
const NOT_COMPLETED_TEXT = 'Not completed';
const REMOVE_SESSION_LABEL = 'Remove session';

function sessionMetaText(row: CalendarRowWithFinish): string {
  let finishLabel = '';
  if (row.finish) {
    finishLabel = ' - expected finish';
  }
  return `${row.minutes} minutes planned${finishLabel}`;
}

function baseSessionItem(row: CalendarRowWithFinish): HTMLElement {
  const item = document.createElement('article');
  item.className = 'day-details-item';
  if (row.finish) {
    item.classList.add('is-finish');
  }

  const head = document.createElement('strong');
  head.textContent = row.title || 'Untitled';

  if (row.finish) {
    const finishBadge = document.createElement('span');
    finishBadge.className = 'day-finish-badge';
    finishBadge.textContent = 'Expected finish';
    item.append(head, finishBadge);
  } else {
    item.append(head);
  }

  const meta = document.createElement('p');
  meta.className = DAY_DETAILS_META_CLASS;
  meta.textContent = sessionMetaText(row);
  item.append(meta);
  return item;
}

function removeSessionButton(
  row: CalendarRowWithFinish,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLButtonElement {
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'btn-session-remove';
  removeButton.textContent = 'x';
  removeButton.setAttribute('aria-label', REMOVE_SESSION_LABEL);
  removeButton.title = REMOVE_SESSION_LABEL;
  removeButton.onclick = () => {
    const title = String(row.title || 'this session');
    const confirmed = globalThis.confirm(`Remove ${title} from ${row.date}?`);
    if (!confirmed) {
      return;
    }
    const removed = interactionHandlers.onSessionRemoved({ row });
    if (!removed) {
      return;
    }
    rerenderDetails();
  };
  return removeButton;
}

export function buildPastSessionItem(
  row: CalendarRowWithFinish,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const item = baseSessionItem(row);
  const sessionKey = sessionKeyFor(row);
  const completeLabel = document.createElement('label');
  completeLabel.className = 'day-complete-toggle';
  const completeInput = document.createElement('input');
  completeInput.type = 'checkbox';
  completeInput.checked = Boolean(interactionHandlers.isSessionCompleted(sessionKey));
  completeLabel.append(completeInput, COMPLETE_TOGGLE_LABEL);

  const status = document.createElement('p');
  status.className = DAY_DETAILS_META_CLASS;
  if (completeInput.checked) {
    status.textContent = COMPLETED_TEXT;
  } else {
    status.textContent = NOT_COMPLETED_TEXT;
  }
  item.classList.toggle(COMPLETE_ITEM_CLASS, completeInput.checked);

  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle(COMPLETE_ITEM_CLASS, checked);
    if (checked) {
      status.textContent = COMPLETED_TEXT;
    } else {
      status.textContent = NOT_COMPLETED_TEXT;
    }
    interactionHandlers.onSessionCompletionChanged({
      completed: checked,
      row,
      sessionKey,
    });
    rerenderDetails();
  };

  item.append(completeLabel, status, removeSessionButton(row, interactionHandlers, rerenderDetails));
  return item;
}

export function buildFutureSessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const item = baseSessionItem(row);
  const estimate = document.createElement('p');
  estimate.className = DAY_DETAILS_META_CLASS;
  estimate.textContent = estimateProgressLabel(
    row,
    state,
    interactionHandlers.getBookById,
    interactionHandlers.isSessionCompleted,
  );
  item.append(estimate, removeSessionButton(row, interactionHandlers, rerenderDetails));
  return item;
}

export function buildTodaySessionItem(
  row: CalendarRowWithFinish,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const item = baseSessionItem(row);
  const sessionKey = sessionKeyFor(row);

  const completeLabel = document.createElement('label');
  completeLabel.className = 'day-complete-toggle';
  const completeInput = document.createElement('input');
  completeInput.type = 'checkbox';
  completeInput.checked = Boolean(interactionHandlers.isSessionCompleted(sessionKey));
  completeLabel.append(completeInput, COMPLETE_TOGGLE_LABEL);
  item.classList.toggle(COMPLETE_ITEM_CLASS, completeInput.checked);

  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle(COMPLETE_ITEM_CLASS, checked);
    interactionHandlers.onSessionCompletionChanged({
      completed: checked,
      row,
      sessionKey,
    });
    rerenderDetails();
  };

  const markCompleteFromProgressUpdate = () => {
    if (completeInput.checked) {
      return;
    }
    completeInput.checked = true;
    item.classList.add(COMPLETE_ITEM_CLASS);
    interactionHandlers.onSessionCompletionChanged({
      completed: true,
      row,
      sessionKey,
    });
    rerenderDetails();
  };

  const book = interactionHandlers.getBookById(row.book_id);
  const effectiveBook = book;
  if (!effectiveBook) {
    item.append(
      completeLabel,
      progressFormForToday(row, fallbackBookForRow(row), interactionHandlers, markCompleteFromProgressUpdate),
      removeSessionButton(row, interactionHandlers, rerenderDetails),
    );
    return item;
  }

  item.append(
    completeLabel,
    progressFormForToday(row, effectiveBook, interactionHandlers, markCompleteFromProgressUpdate),
    removeSessionButton(row, interactionHandlers, rerenderDetails),
  );
  return item;
}
