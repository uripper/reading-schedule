/**
 * Returns row fixtures used for session-index tests.
 *
 * @returns {Array<Record<string, string|number>>} Session index fixture rows.
 */
export function indexRowsFixture() {
  return [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "a",
      title: "A",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-20",
      session_index: 3,
      book_id: "b",
      title: "B",
      minutes: 15,
      words_planned: 1500,
    },
    {
      date: "2026-02-21",
      session_index: 2,
      book_id: "c",
      title: "C",
      minutes: 12,
      words_planned: 1200,
    },
  ];
}

/**
 * Returns row fixtures used for historical pace tests.
 *
 * @returns {Array<Record<string, string|number>>} Historical pace fixture rows.
 */
export function historicalPaceRowsFixture() {
  return [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-1",
      title: "Book",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-21",
      session_index: 1,
      book_id: "book-1",
      title: "Book",
      minutes: 5,
      words_planned: 600,
    },
  ];
}

/**
 * Returns row fixtures used for removable-session tests.
 *
 * @returns {Array<Record<string, string|number>>} Removable rows fixture.
 */
export function removableRowsFixture() {
  return [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-1",
      title: "Book 1",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-20",
      session_index: 2,
      book_id: "book-1",
      title: "Book 1",
      minutes: 12,
      words_planned: 1200,
    },
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-2",
      title: "Book 2",
      minutes: 9,
      words_planned: 900,
    },
  ];
}
