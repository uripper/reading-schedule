import type { Book } from '../books/types.js';
import { BOOK_STATUS_IN_PROGRESS } from '../books/status.js';
import { rowsWithFinishFirst, type CalendarRowWithFinish } from './data.js';
import { estimateProgressLabel } from './estimates.js';
import { parseOptionalNumber, sessionKeyFor } from './utils.js';

export type DayMode = 'past' | 'today' | 'future';

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

export type ManualSessionBook = {
  bookId: string;
  title: string;
};

export type ManualSessionAddPayload = {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
};

export type DetailInteractionHandlers = {
  isSessionCompleted: (sessionKey: string) => boolean;
  onSessionCompletionChanged: (payload: CompletionPayload) => void;
  onSessionProgressUpdated: (payload: ProgressPayload) => Book | null;
  getBookById: (bookId: string) => Book | null;
  listSessionBooks: () => ManualSessionBook[];
  onManualSessionAdded: (payload: ManualSessionAddPayload) => boolean;
  onSessionRemoved: (payload: { row: CalendarRowWithFinish }) => boolean;
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
const MANUAL_ADD_TITLE = 'Manual add';
const REMOVE_SESSION_LABEL = 'Remove session';

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
): { initialPagesValue: string; initialPercentValue: string; applied: boolean } {
  event.preventDefault();
  const pagesRead = changedNumberValue(pagesInput, initialPagesValue);
  const progressPercent = changedNumberValue(pctInput, initialPercentValue);
  if (pagesRead === null && progressPercent === null) {
    return { initialPagesValue, initialPercentValue, applied: true };
  }
  const updated = interactionHandlers.onSessionProgressUpdated({
    bookId: row.book_id,
    pagesRead,
    progressPercent,
    row,
  });
  if (!updated) {
    return { initialPagesValue, initialPercentValue, applied: false };
  }
  return {
    initialPagesValue: syncInputValue(pagesInput, updated.pages_read),
    initialPercentValue: syncInputValue(pctInput, updated.progress_percent),
    applied: true,
  };
}

function progressFormForToday(
  row: CalendarRowWithFinish,
  book: Book,
  interactionHandlers: DetailInteractionHandlers,
  onProgressApplied: () => void,
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
    if (updatedValues.applied) {
      onProgressApplied();
    }
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

function minuteValueForManualInput(defaultMinutes?: number): string {
  const parsed = Number(defaultMinutes || 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return `${Math.max(1, Math.round(parsed))}`;
  }
  return '10';
}

function sortedManualBooks(books: ManualSessionBook[] = []): ManualSessionBook[] {
  return [...books].sort((left, right) => {
    return String(left.title || '').localeCompare(String(right.title || ''), undefined, { sensitivity: 'base' });
  });
}

export function buildManualSessionAddPanel(
  dateKey: string,
  mode: DayMode,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
  defaultBookId = '',
  defaultMinutes?: number,
): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'day-manual-add';

  const title = document.createElement('h3');
  title.textContent = MANUAL_ADD_TITLE;
  panel.append(title);

  const books = sortedManualBooks(interactionHandlers.listSessionBooks());
  if (!books.length) {
    const hint = document.createElement('p');
    hint.className = 'hint-text';
    hint.textContent = 'Add a book first, then you can manually add calendar sessions.';
    panel.append(hint);
    return panel;
  }

  const form = document.createElement('form');
  form.className = 'day-manual-add-form';

  const bookLabel = document.createElement('label');
  bookLabel.className = 'day-progress-field';
  bookLabel.textContent = 'Book';

  const bookSelect = document.createElement('select');
  bookSelect.required = true;
  books.forEach((book) => {
    const option = document.createElement('option');
    option.value = book.bookId;
    option.textContent = book.title;
    bookSelect.append(option);
  });
  if (defaultBookId && books.some((book) => book.bookId === defaultBookId)) {
    bookSelect.value = defaultBookId;
  }
  bookLabel.append(bookSelect);

  const minutesLabel = document.createElement('label');
  minutesLabel.className = 'day-progress-field';
  minutesLabel.textContent = 'Minutes';

  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.min = '1';
  minutesInput.step = '1';
  minutesInput.required = true;
  minutesInput.value = minuteValueForManualInput(defaultMinutes);
  minutesLabel.append(minutesInput);

  const completeLabel = document.createElement('label');
  completeLabel.className = 'day-complete-toggle';
  const completeInput = document.createElement('input');
  completeInput.type = 'checkbox';
  completeLabel.append(completeInput, ' Mark complete');

  const addButton = document.createElement('button');
  addButton.type = 'submit';
  addButton.className = 'btn';
  addButton.textContent = 'Add Session';

  form.append(bookLabel, minutesLabel);
  if (mode !== 'future') {
    form.append(completeLabel);
  }
  form.append(addButton);

  form.onsubmit = (event) => {
    event.preventDefault();
    const selectedBookId = String(bookSelect.value || '').trim();
    const parsedMinutes = Number(minutesInput.value || 0);
    if (!selectedBookId || !Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
      return;
    }

    const added = interactionHandlers.onManualSessionAdded({
      date: dateKey,
      bookId: selectedBookId,
      minutes: parsedMinutes,
      completed: mode !== 'future' && Boolean(completeInput.checked),
    });
    if (!added) {
      return;
    }
    rerenderDetails();
  };

  panel.append(form);
  return panel;
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
  item.append(
    completeLabel,
    progressFormForToday(row, book || fallbackBook, interactionHandlers, markCompleteFromProgressUpdate),
    removeSessionButton(row, interactionHandlers, rerenderDetails),
  );
  return item;
}
