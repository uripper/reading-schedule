import test from 'node:test';
import assert from 'node:assert/strict';

import { dayKey } from '../dist/renderer/calendar/utils.js';
import { normalizeBook } from '../dist/renderer/books/model.js';
import { BOOK_STATUS_IN_PROGRESS, BOOK_STATUS_READ } from '../dist/renderer/books/status.js';

test('normalizeBook keeps explicit finish date for read books', () => {
  const normalized = normalizeBook({
    title: 'Read Book',
    status: BOOK_STATUS_READ,
    words_total: 1000,
    finished_at: '2026-02-10',
  });

  assert.equal(normalized.finished_at, '2026-02-10');
});

test('normalizeBook defaults finish date to today for read books', () => {
  const today = dayKey(new Date());
  const normalized = normalizeBook({
    title: 'Read Book',
    status: BOOK_STATUS_READ,
    words_total: 1000,
    finished_at: '',
  });

  assert.equal(normalized.finished_at, today);
});

test('normalizeBook clears finish date for non-read books', () => {
  const normalized = normalizeBook({
    title: 'In Progress Book',
    status: BOOK_STATUS_IN_PROGRESS,
    words_total: 1000,
    finished_at: '2026-02-10',
  });

  assert.equal(normalized.finished_at, null);
});
