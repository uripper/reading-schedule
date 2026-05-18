// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { groupsForEstimatedFinish } from "../dist/renderer/books/estimated_finish_groups.js";
import { finishDatesByBookId } from "../dist/renderer/books/finish-dates.js";
import {
    GROUP_BY_TITLE_LETTER,
    groupBooks,
} from "../dist/renderer/books/grouping.js";
import { metaLabel } from "../dist/renderer/books/presenters.js";
import {
    SORT_BY_PROGRESS,
    SORT_BY_ESTIMATED_FINISH,
    SORT_BY_TITLE,
    sortBooks,
} from "../dist/renderer/books/sort.js";
import { ensureBooksToolbarControls } from "../dist/renderer/books/toolbar_dom.js";
import { updateSortBySelection } from "../dist/renderer/books/toolbar_updates.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const DEFAULT_BOOK = {
    author: "",
    blocked_by: null,
    book_id: "",
    cover_local_path: "",
    cover_url: "",
    deadline: null,
    difficulty: 3,
    finished_at: null,
    lookup_note: "",
    max_minutes_per_day: null,
    min_blocks_per_session: 1,
    pages_read: null,
    pages_total: null,
    priority: 3,
    progress_percent: 0,
    shelf: "",
    status: "to_read",
    title: "",
    words_total: null,
};

const ESTIMATED_FINISH_ROWS = [
    { book_id: "book-1", date: "2026-12-22", session_index: 1 },
];

const ESTIMATED_FINISH_BOOKS = [
    baseBook({ book_id: "book-1", title: "Anna Karenina" }),
    baseBook({
        book_id: "book-2",
        finished_at: "2026-01-10",
        status: "read",
        title: "Ice",
    }),
    baseBook({
        book_id: "book-3",
        finished_at: "2026-01-20",
        status: "read",
        title: "White Noise",
    }),
];

/**
 * Builds canonical book fixture with override support.
 * @param {Record<string, unknown>} overrides - Book field overrides.
 * @returns {Record<string, unknown>} Book fixture object.
 */
function baseBook(overrides) {
    return { ...DEFAULT_BOOK, ...overrides };
}

test('groupBooks groups "The ..." by the next word letter', () => {
    const BOOKS = [
        baseBook({ book_id: "book-1", title: "The Book of Disquiet" }),
        baseBook({ book_id: "book-2", title: "Another Book" }),
    ];
    const GROUPS = groupBooks(BOOKS, GROUP_BY_TITLE_LETTER, {});
    assert.equal(GROUPS.length, 2);
    assert.equal(GROUPS[0].label, "A");
    assert.equal(GROUPS[1].label, "B");
});

test('sortBooks sorts titles using key without leading "The "', () => {
    const BOOKS = [
        baseBook({ book_id: "book-1", title: "The Odyssey" }),
        baseBook({ book_id: "book-2", title: "The Book of Disquiet" }),
    ];
    const SORTED = sortBooks({
        books: BOOKS,
        finishDateByBookId: {},
        sortBy: SORT_BY_TITLE,
        sortDirection: "asc",
    });
    assert.equal(SORTED[0].title, "The Book of Disquiet");
    assert.equal(SORTED[1].title, "The Odyssey");
});

test("finishDatesByBookId uses explicit finished_at for read books", () => {
    const ROWS = [{ book_id: "book-1", date: "2026-12-22", session_index: 1 }];
    const BOOKS = [
        baseBook({
            book_id: "book-1",
            finished_at: "2026-01-10",
            status: "read",
        }),
        baseBook({
            book_id: "book-2",
            finished_at: "2026-01-20",
            status: "read",
        }),
    ];

    const FINISH_DATES = finishDatesByBookId(ROWS, BOOKS);
    assert.equal(FINISH_DATES["book-1"], "2026-01-10");
    assert.equal(FINISH_DATES["book-2"], "2026-01-20");
});

test("sortBooks by estimated finish includes finished read books in date order", () => {
    const FINISH_DATES = finishDatesByBookId(
        ESTIMATED_FINISH_ROWS,
        ESTIMATED_FINISH_BOOKS,
    );
    const SORTED = sortBooks({
        books: ESTIMATED_FINISH_BOOKS,
        finishDateByBookId: FINISH_DATES,
        sortBy: SORT_BY_ESTIMATED_FINISH,
        sortDirection: "asc",
    });
    assert.deepEqual(
        SORTED.map((book) => book.book_id),
        ["book-2", "book-3", "book-1"],
    );
});

test("metaLabel shows finished date for read books", () => {
    const BOOK = baseBook({
        book_id: "book-1",
        finished_at: "2026-01-20",
        status: "read",
    });
    const FINISH_DATES = { "book-1": "2026-01-20" };

    const LABEL = metaLabel(BOOK, { finishDateByBookId: FINISH_DATES });
    assert.equal(LABEL.includes("Finished 2026-01-20"), true);
    assert.equal(LABEL.includes("Est. finish"), false);
});

test("groupsForEstimatedFinish orders sections as dropped, read, then active", () => {
    const SORTED_BOOKS = [
        baseBook({ book_id: "book-1", status: "dropped", title: "Drop A" }),
        baseBook({ book_id: "book-2", status: "read", title: "Read A" }),
        baseBook({ book_id: "book-3", status: "in_progress", title: "IP A" }),
        baseBook({ book_id: "book-4", status: "to_read", title: "TR A" }),
    ];

    const GROUPS = groupsForEstimatedFinish(SORTED_BOOKS);
    assert.deepEqual(
        GROUPS.map((group) => group.label),
        ["Dropped", "Read", "In Progress / To Read"],
    );
    assert.deepEqual(
        GROUPS.map((group) => group.books.map((book) => book.book_id)),
        [["book-1"], ["book-2"], ["book-3", "book-4"]],
    );
});

test("sortBooks sorts numeric fields such as progress_percent", () => {
    const BOOKS = [
        baseBook({ book_id: "book-1", progress_percent: 80, title: "B" }),
        baseBook({ book_id: "book-2", progress_percent: 10, title: "A" }),
        baseBook({ book_id: "book-3", progress_percent: 40, title: "C" }),
    ];
    const SORTED = sortBooks({
        books: BOOKS,
        finishDateByBookId: {},
        sortBy: SORT_BY_PROGRESS,
        sortDirection: "asc",
    });
    assert.deepEqual(
        SORTED.map((book) => book.book_id),
        ["book-2", "book-3", "book-1"],
    );
});

test("updateSortBySelection keeps toolbar sort aligned with controller state", () => {
    const DOM = installFakeDom();
    try {
        const TOOLBAR = DOM.createElement("div");
        const CONTROLS = ensureBooksToolbarControls(TOOLBAR);
        CONTROLS.sortBySelect.value = SORT_BY_TITLE;

        updateSortBySelection(
            CONTROLS.sortBySelect,
            SORT_BY_ESTIMATED_FINISH,
        );

        assert.equal(
            CONTROLS.sortBySelect.value,
            SORT_BY_ESTIMATED_FINISH,
        );
    } finally {
        DOM.restore();
    }
});
