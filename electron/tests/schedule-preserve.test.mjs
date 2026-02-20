import test from 'node:test';
import assert from 'node:assert/strict';

import { pruneScheduleCompletions } from '../dist/renderer/app/schedule_preserve.js';
import { sessionKeyFor } from '../dist/renderer/calendar/utils.js';

function row(overrides = {}) {
  return {
    date: '2026-02-20',
    session_index: 1,
    book_id: 'book-1',
    title: 'Book 1',
    minutes: 10,
    words_planned: 1000,
    ...overrides,
  };
}

test('pruneScheduleCompletions keeps day-book fallback keys for rows that still exist', () => {
  const keptRow = row();
  const droppedRow = row({ date: '2026-02-21', session_index: 1, book_id: 'book-2' });
  const completions = {
    [sessionKeyFor(keptRow)]: true,
    [`${keptRow.date}|${keptRow.book_id}`]: true,
    [sessionKeyFor(droppedRow)]: true,
    [`${droppedRow.date}|${droppedRow.book_id}`]: true,
  };

  const pruned = pruneScheduleCompletions(completions, [keptRow]);

  assert.deepEqual(pruned, {
    [sessionKeyFor(keptRow)]: true,
    [`${keptRow.date}|${keptRow.book_id}`]: true,
  });
});

test('pruneScheduleCompletions removes stale day-book keys when matching row no longer exists', () => {
  const keepRow = row();
  const completions = {
    [`${keepRow.date}|${keepRow.book_id}`]: true,
    '2026-02-25|book-missing': true,
  };

  const pruned = pruneScheduleCompletions(completions, [keepRow]);

  assert.deepEqual(pruned, {
    [`${keepRow.date}|${keepRow.book_id}`]: true,
  });
});
