import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  isStatusSchedulable,
  statusFromRaw,
} from '../dist/renderer/books/status.js';

test('statusFromRaw defaults to to_read at zero progress', () => {
  assert.equal(statusFromRaw('', 0), BOOK_STATUS_TO_READ);
});

test('statusFromRaw upgrades in_progress to read at 100 percent', () => {
  assert.equal(statusFromRaw(BOOK_STATUS_IN_PROGRESS, 100), BOOK_STATUS_READ);
});

test('dropped status remains dropped at 100 percent', () => {
  assert.equal(statusFromRaw(BOOK_STATUS_DROPPED, 100), BOOK_STATUS_DROPPED);
});

test('read and dropped statuses are not schedulable', () => {
  assert.equal(isStatusSchedulable(BOOK_STATUS_READ), false);
  assert.equal(isStatusSchedulable(BOOK_STATUS_DROPPED), false);
  assert.equal(isStatusSchedulable(BOOK_STATUS_TO_READ), true);
});
