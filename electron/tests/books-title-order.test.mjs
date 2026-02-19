import test from 'node:test';
import assert from 'node:assert/strict';

import { GROUP_BY_TITLE_LETTER, groupBooks } from '../dist/renderer/books/grouping.js';
import { SORT_BY_TITLE, sortBooks } from '../dist/renderer/books/sort.js';

function baseBook(overrides) {
  return {
    book_id: '',
    title: '',
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
    ...overrides,
  };
}

test('groupBooks groups "The ..." by the next word letter', () => {
  const books = [
    baseBook({ book_id: 'book-1', title: 'The Book of Disquiet' }),
    baseBook({ book_id: 'book-2', title: 'Another Book' }),
  ];
  const groups = groupBooks(books, GROUP_BY_TITLE_LETTER, {});
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, 'A');
  assert.equal(groups[1].label, 'B');
});

test('sortBooks sorts titles using key without leading "The "', () => {
  const books = [
    baseBook({ book_id: 'book-1', title: 'The Odyssey' }),
    baseBook({ book_id: 'book-2', title: 'The Book of Disquiet' }),
  ];
  const sorted = sortBooks(books, SORT_BY_TITLE, 'asc', {});
  assert.equal(sorted[0].title, 'The Book of Disquiet');
  assert.equal(sorted[1].title, 'The Odyssey');
});
