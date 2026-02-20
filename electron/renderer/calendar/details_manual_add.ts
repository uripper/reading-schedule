import type { DayMode, DetailInteractionHandlers, ManualSessionBook } from './details_types.js';

const MANUAL_ADD_TITLE = 'Manual add';

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
