import type { Book } from '../books/types.js';
import type { CalendarRowWithFinish } from './data.js';
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
  value: string | number | null | undefined,
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
  setInputValueFromBookProgress(pagesInput, book.pages_read);

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
    event.preventDefault();
    const pagesRead = changedNumberValue(pagesInput, initialPagesValue);
    const progressPercent = changedNumberValue(pctInput, initialPercentValue);
    if (pagesRead === null && progressPercent === null) {
      return;
    }
    const updated = interactionHandlers.onSessionProgressUpdated({
      bookId: row.book_id,
      pagesRead,
      progressPercent,
      row,
    });
    if (updated && updated.pages_read !== null && updated.pages_read !== undefined) {
      pagesInput.value = String(updated.pages_read);
      initialPagesValue = String(pagesInput.value ?? '').trim();
    }
    if (updated && updated.progress_percent !== null && updated.progress_percent !== undefined) {
      pctInput.value = String(updated.progress_percent);
      initialPercentValue = String(pctInput.value ?? '').trim();
    }
  };

  return progressForm;
}

function baseSessionItem(row: CalendarRowWithFinish): HTMLElement {
  const item = document.createElement('article');
  item.className = 'day-details-item';

  const head = document.createElement('strong');
  head.textContent = row.title || 'Untitled';

  const meta = document.createElement('p');
  meta.className = 'day-details-meta';
  meta.textContent = sessionMetaText(row);
  item.append(head, meta);
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
  return [...incompleteRows, ...completeRows];
}

export function completedRows(
  rows: CalendarRowWithFinish[],
  interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
  return rows.filter((row) => {
    return Boolean(interactionHandlers.isSessionCompleted(sessionKeyFor(row)));
  });
}

export function buildPastSessionItem(row: CalendarRowWithFinish): HTMLElement {
  const item = baseSessionItem(row);
  const completed = document.createElement('p');
  completed.className = 'day-details-meta';
  completed.textContent = 'Completed';
  item.classList.add('is-complete');
  item.append(completed);
  return item;
}

export function buildFutureSessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
): HTMLElement {
  const item = baseSessionItem(row);
  const estimate = document.createElement('p');
  estimate.className = 'day-details-meta';
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
  completeLabel.append(completeInput, ' Complete session');
  item.classList.toggle('is-complete', completeInput.checked);

  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle('is-complete', checked);
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
    cover_url: '',
    cover_local_path: '',
    lookup_note: '',
  };
  item.append(completeLabel, progressFormForToday(row, book || fallbackBook, interactionHandlers));
  return item;
}
