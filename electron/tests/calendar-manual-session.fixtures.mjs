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
