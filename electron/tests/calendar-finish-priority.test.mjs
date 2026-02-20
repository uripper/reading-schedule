import test from 'node:test';
import assert from 'node:assert/strict';

import { groupRowsByDate } from '../dist/renderer/calendar/data.js';
import { rowsWithCompletedLast } from '../dist/renderer/calendar/details_helpers.js';
import { sessionKeyFor } from '../dist/renderer/calendar/utils.js';

function row(overrides) {
  return {
    date: '2026-02-22',
    session_index: 1,
    book_id: 'book-1',
    title: 'Untitled',
    minutes: 10,
    finish: false,
    ...overrides,
  };
}

test('groupRowsByDate prioritizes expected-finish rows within each day', () => {
  const date = '2026-02-22';
  const grouped = groupRowsByDate([
    row({ session_index: 1, book_id: 'book-1', finish: false }),
    row({ session_index: 2, book_id: 'book-2', finish: true }),
    row({ session_index: 3, book_id: 'book-3', finish: false }),
    row({ session_index: 4, book_id: 'book-4', finish: true }),
  ]);

  assert.deepEqual(
    grouped[date].map((entry) => entry.book_id),
    ['book-2', 'book-4', 'book-1', 'book-3'],
  );
});

test('rowsWithCompletedLast keeps expected-finish rows first inside incomplete and complete groups', () => {
  const rows = [
    row({ session_index: 1, book_id: 'book-complete-finish', finish: true }),
    row({ session_index: 2, book_id: 'book-incomplete-normal', finish: false }),
    row({ session_index: 3, book_id: 'book-incomplete-finish', finish: true }),
    row({ session_index: 4, book_id: 'book-complete-normal', finish: false }),
  ];

  const completedSessionKeys = new Set([
    sessionKeyFor(rows[0]),
    sessionKeyFor(rows[3]),
  ]);

  const ordered = rowsWithCompletedLast(rows, {
    isSessionCompleted: (sessionKey) => completedSessionKeys.has(sessionKey),
    onSessionCompletionChanged: () => {},
    onSessionProgressUpdated: () => null,
    getBookById: () => null,
  });

  assert.deepEqual(
    ordered.map((entry) => entry.book_id),
    [
      'book-incomplete-finish',
      'book-incomplete-normal',
      'book-complete-finish',
      'book-complete-normal',
    ],
  );
});
