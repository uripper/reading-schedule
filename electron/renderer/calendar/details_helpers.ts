import type { Book } from '../books/types.js';
import { BOOK_STATUS_IN_PROGRESS } from '../books/status.js';
import { rowsWithFinishFirst, type CalendarRowWithFinish } from './data.js';
import { estimateProgressLabel } from './estimates.js';
import { parseOptionalNumber, sessionKeyFor } from './utils.js';

type DayMode = 'past' | 'today' | 'future';

type CompletionPayload = {
  completed: boolean;
  row: CalendarRowWithFinish;
  sessionKey: string;
};

type ProgressPayload = {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row: CalendarRowWithFinish;
};

export type DetailInteractionHandlers = {
  isSessionCompleted: (sessionKey: string) => boolean;
  onSessionCompletionChanged: (payload: CompletionPayload) => void;
  onSessionProgressUpdated: (payload: ProgressPayload) => Book | null;
  getBookById: (bookId: string) => Book | null;
};

type CalendarStateSubset = {
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
};

const DAY_DETAILS_META_CLASS = 'day-details-meta';
const COMPLETE_ITEM_CLASS = 'is-complete';
const COMPLETE_TOGGLE_LABEL = ' Complete session';
const COMPLETED_TEXT = 'Completed';
const NOT_COMPLETED_TEXT = 'Not completed';

function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sessionMetaText(row: CalendarRowWithFinish): string {
  let finishLabel = '';
  if (row.finish) {
    finishLabel = ' - expected finish';
  }
  return `${row.minutes} minutes planned${finishLabel}`;
}

function setInputValueFromBookProgress(
  inputNode: HTMLInputElement,
  value?: string | number,
): void {
  if (value !== null && value !== undefined) {
    inputNode.value = String(value);
  }
}

function changedNumberValue(inputNode: HTMLInputElement, initialValue: string): number | null {
  const currentValue = String(inputNode.value ?? '').trim();
  if (currentValue === String(initialValue)) {
    return null;
  }
  return parseOptionalNumber(currentValue);
}

function syncInputValue(inputNode: HTMLInputElement, nextValue?: number | null): string {
  if (nextValue === null || nextValue === undefined) {
    return String(inputNode.value ?? '').trim();
  }
  inputNode.value = String(nextValue);
  return String(inputNode.value ?? '').trim();
}

function submitProgressUpdate(
  event: SubmitEvent,
  row: CalendarRowWithFinish,
  pagesInput: HTMLInputElement,
  pctInput: HTMLInputElement,
  initialPagesValue: string,
  initialPercentValue: string,
  interactionHandlers: DetailInteractionHandlers,
): { initialPagesValue: string; initialPercentValue: string } {
  event.preventDefault();
  const pagesRead = changedNumberValue(pagesInput, initialPagesValue);
  const progressPercent = changedNumberValue(pctInput, initialPercentValue);
  if (pagesRead === null && progressPercent === null) {
    return { initialPagesValue, initialPercentValue };
  }
  const updated = interactionHandlers.onSessionProgressUpdated({
    bookId: row.book_id,
    pagesRead,
    progressPercent,
    row,
  });
  if (!updated) {
    return { initialPagesValue, initialPercentValue };
  }
  return {
    initialPagesValue: syncInputValue(pagesInput, updated.pages_read),
    initialPercentValue: syncInputValue(pctInput, updated.progress_percent),
  };
}

function progressFormForToday(
  row: CalendarRowWithFinish,
  book: Book,
  interactionHandlers: DetailInteractionHandlers,
): HTMLFormElement {
  const progressForm = document.createElement('form');
  progressForm.className = 'day-progress-form';

  const pagesInput = document.createElement('input');
  pagesInput.type = 'number';
  pagesInput.min = '0';
  pagesInput.step = '1';
  pagesInput.placeholder = 'Pages read';
  setInputValueFromBookProgress(pagesInput, book.pages_read ?? undefined);

  const pctInput = document.createElement('input');
  pctInput.type = 'number';
  pctInput.min = '0';
  pctInput.max = '100';
  pctInput.step = '0.1';
  pctInput.placeholder = 'Percent complete';
  setInputValueFromBookProgress(pctInput, book.progress_percent);

  const pagesLabel = document.createElement('label');
  pagesLabel.className = 'day-progress-field';
  pagesLabel.textContent = 'Pages Read';
  pagesLabel.append(pagesInput);

  const percentLabel = document.createElement('label');
  percentLabel.className = 'day-progress-field';
  percentLabel.textContent = 'Complete %';
  percentLabel.append(pctInput);

  let initialPagesValue = String(pagesInput.value ?? '').trim();
  let initialPercentValue = String(pctInput.value ?? '').trim();

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Update Progress';

  progressForm.append(pagesLabel, percentLabel, saveBtn);
  progressForm.onsubmit = (event) => {
    const updatedValues = submitProgressUpdate(
      event,
      row,
      pagesInput,
      pctInput,
      initialPagesValue,
      initialPercentValue,
      interactionHandlers,
    );
    initialPagesValue = updatedValues.initialPagesValue;
    initialPercentValue = updatedValues.initialPercentValue;
  };

  return progressForm;
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

export function dayMode(dateKey: string): DayMode {
  const today = todayDateKey();
  if (dateKey < today) {
    return 'past';
  }
  if (dateKey > today) {
    return 'future';
  }
  return 'today';
}

export function rowsWithCompletedLast(
  rows: CalendarRowWithFinish[],
  interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
  const incompleteRows: CalendarRowWithFinish[] = [];
  const completeRows: CalendarRowWithFinish[] = [];
  rows.forEach((row) => {
    const complete = Boolean(interactionHandlers.isSessionCompleted(sessionKeyFor(row)));
    if (complete) {
      completeRows.push(row);
      return;
    }
    incompleteRows.push(row);
  });
  return [...rowsWithFinishFirst(incompleteRows), ...rowsWithFinishFirst(completeRows)];
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
  status.textContent = completeInput.checked ? COMPLETED_TEXT : NOT_COMPLETED_TEXT;
  item.classList.toggle(COMPLETE_ITEM_CLASS, completeInput.checked);

  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle(COMPLETE_ITEM_CLASS, checked);
    status.textContent = checked ? COMPLETED_TEXT : NOT_COMPLETED_TEXT;
    interactionHandlers.onSessionCompletionChanged({
      completed: checked,
      row,
      sessionKey,
    });
    rerenderDetails();
  };

  item.append(completeLabel, status);
  return item;
}

export function buildFutureSessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
): HTMLElement {
  const item = baseSessionItem(row);
  const estimate = document.createElement('p');
  estimate.className = DAY_DETAILS_META_CLASS;
  estimate.textContent = estimateProgressLabel(row, state, interactionHandlers.getBookById);
  item.append(estimate);
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

  const book = interactionHandlers.getBookById(row.book_id);
  const fallbackBook: Book = {
    book_id: row.book_id,
    title: row.title,
    author: '',
    words_total: null,
    pages_total: null,
    pages_read: null,
    progress_percent: 0,
    priority: 3,
    difficulty: 3,
    min_blocks_per_session: 1,
    max_minutes_per_day: null,
    deadline: null,
    blocked_by: null,
    shelf: '',
    status: BOOK_STATUS_IN_PROGRESS,
    finished_at: null,
    cover_url: '',
    cover_local_path: '',
    lookup_note: '',
  };
  item.append(completeLabel, progressFormForToday(row, book || fallbackBook, interactionHandlers));
  return item;
}
