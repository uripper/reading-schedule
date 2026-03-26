/**
 * Returns row fixtures used for session-index tests.
 * @returns {Array<Record<string, string|number>>} Session index fixture rows.
 */
export function indexRowsFixture() {
    return [
        {
            book_id: "a",
            date: "2026-02-20",
            minutes: 10,
            session_index: 1,
            title: "A",
            words_planned: 1000,
        },
        {
            book_id: "b",
            date: "2026-02-20",
            minutes: 15,
            session_index: 3,
            title: "B",
            words_planned: 1500,
        },
        {
            book_id: "c",
            date: "2026-02-21",
            minutes: 12,
            session_index: 2,
            title: "C",
            words_planned: 1200,
        },
    ];
}

/**
 * Returns row fixtures used for historical pace tests.
 * @returns {Array<Record<string, string|number>>} Historical pace fixture rows.
 */
export function historicalPaceRowsFixture() {
    return [
        {
            book_id: "book-1",
            date: "2026-02-20",
            minutes: 10,
            session_index: 1,
            title: "Book",
            words_planned: 1000,
        },
        {
            book_id: "book-1",
            date: "2026-02-21",
            minutes: 5,
            session_index: 1,
            title: "Book",
            words_planned: 600,
        },
    ];
}

/**
 * Returns row fixtures used for removable-session tests.
 * @returns {Array<Record<string, string|number>>} Removable rows fixture.
 */
export function removableRowsFixture() {
    return [
        {
            book_id: "book-1",
            date: "2026-02-20",
            minutes: 10,
            session_index: 1,
            title: "Book 1",
            words_planned: 1000,
        },
        {
            book_id: "book-1",
            date: "2026-02-20",
            minutes: 12,
            session_index: 2,
            title: "Book 1",
            words_planned: 1200,
        },
        {
            book_id: "book-2",
            date: "2026-02-20",
            minutes: 9,
            session_index: 1,
            title: "Book 2",
            words_planned: 900,
        },
    ];
}
