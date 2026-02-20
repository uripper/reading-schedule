import test from 'node:test';
import assert from 'node:assert/strict';

import { estimateProgressLabel } from '../dist/renderer/calendar/estimates.js';

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function plusDays(key, delta) {
  const date = new Date(`${key}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return dayKey(date);
}

function row(overrides) {
  return {
    book_id: 'book-1',
    date: '',
    session_index: 1,
    words_planned: 1000,
    ...overrides,
  };
}

function book(overrides = {}) {
  return {
    book_id: 'book-1',
    title: 'Book',
    author: 'Author',
    words_total: 4000,
    pages_total: 400,
    pages_read: null,
    progress_percent: 25,
    priority: 3,
    difficulty: 3,
    min_blocks_per_session: 1,
    max_minutes_per_day: null,
    deadline: null,
    blocked_by: null,
    shelf: '',
    status: 'in_progress',
    finished_at: null,
    cover_url: '',
    cover_local_path: '',
    lookup_note: '',
    ...overrides,
  };
}

test('estimateProgressLabel includes incomplete current-day sessions for future estimates', () => {
  const today = dayKey(new Date());
  const tomorrow = plusDays(today, 1);
  const todayRow = row({ date: today, session_index: 1 });
  const futureRow = row({ date: tomorrow, session_index: 1 });
  const state = {
    rows: [todayRow, futureRow],
    totalsByBookId: { 'book-1': 4000 },
  };

  const label = estimateProgressLabel(
    futureRow,
    state,
    () => book(),
    () => false,
  );

  assert.equal(
    label,
    'Estimated before session: 200 pages (50%) -> after session: 300 pages (75%)',
  );
});

test('estimateProgressLabel ignores completed current-day sessions for future estimates', () => {
  const today = dayKey(new Date());
  const tomorrow = plusDays(today, 1);
  const todayRow = row({ date: today, session_index: 1 });
  const futureRow = row({ date: tomorrow, session_index: 1 });
  const state = {
    rows: [todayRow, futureRow],
    totalsByBookId: { 'book-1': 4000 },
  };

  const label = estimateProgressLabel(
    futureRow,
    state,
    () => book(),
    (sessionKey) => sessionKey === `${today}|1|book-1`,
    (sessionKey) => sessionKey === `${today}|1|book-1`,
  );

  assert.equal(
    label,
    'Estimated before session: 100 pages (25%) -> after session: 200 pages (50%)',
  );
});

test('estimateProgressLabel ignores completed pre-target sessions even when date is after local today', () => {
  const today = dayKey(new Date());
  const shiftedCurrent = plusDays(today, 1);
  const target = plusDays(today, 2);
  const shiftedCurrentRow = row({ date: shiftedCurrent, session_index: 1 });
  const targetRow = row({ date: target, session_index: 1 });
  const state = {
    rows: [shiftedCurrentRow, targetRow],
    totalsByBookId: { 'book-1': 4000 },
  };

  const label = estimateProgressLabel(
    targetRow,
    state,
    () => book(),
    (sessionKey) => sessionKey === `${shiftedCurrent}|1|book-1`,
    (sessionKey) => sessionKey === `${shiftedCurrent}|1|book-1`,
  );

  assert.equal(
    label,
    'Estimated before session: 100 pages (25%) -> after session: 200 pages (50%)',
  );
});

test('estimateProgressLabel uses current progress for completed current-day session', () => {
  const today = dayKey(new Date());
  const todayRow = row({ date: today, session_index: 1 });
  const state = {
    rows: [todayRow],
    totalsByBookId: { 'book-1': 4000 },
  };

  const label = estimateProgressLabel(
    todayRow,
    state,
    () => book({ progress_percent: 40 }),
    (sessionKey) => sessionKey === `${today}|1|book-1`,
    (sessionKey) => sessionKey === `${today}|1|book-1`,
  );

  assert.equal(
    label,
    'Estimated by end of this session: 160 pages read (40% complete)',
  );
});

test('estimateProgressLabel treats completed current-day sessions as planned when no manual update exists', () => {
  const today = dayKey(new Date());
  const tomorrow = plusDays(today, 1);
  const todayRow = row({ date: today, session_index: 1 });
  const futureRow = row({ date: tomorrow, session_index: 1 });
  const state = {
    rows: [todayRow, futureRow],
    totalsByBookId: { 'book-1': 4000 },
  };

  const label = estimateProgressLabel(
    futureRow,
    state,
    () => book(),
    (sessionKey) => sessionKey === `${today}|1|book-1`,
    () => false,
  );

  assert.equal(
    label,
    'Estimated before session: 200 pages (50%) -> after session: 300 pages (75%)',
  );
});
