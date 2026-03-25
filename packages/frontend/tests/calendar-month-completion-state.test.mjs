// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { mergeDisplayRows } from "../dist/renderer/calendar/month-rows.js";

test("mergeDisplayRows adds completed-book rows without sessions", () => {
    const MERGED = mergeDisplayRows(
        [{ book_id: "book-1", date: "2026-02-10", session_index: 1 }],
        [{ book_id: "book-2", date: "2026-02-10", finish: true, minutes: 0 }],
    );

    assert.deepEqual(
        MERGED.map((row) => row.book_id),
        ["book-2", "book-1"],
    );
});

test("mergeDisplayRows marks scheduled rows as finish when book completed that day", () => {
    const MERGED = mergeDisplayRows(
        [
            {
                book_id: "book-1",
                date: "2026-02-10",
                finish: false,
                session_index: 1,
            },
        ],
        [{ book_id: "book-1", date: "2026-02-10", finish: true, minutes: 0 }],
    );

    assert.equal(MERGED.length, 1);
    assert.equal(MERGED[0]?.finish, true);
});

test("mergeDisplayRows keeps finish rows first in day chip ordering", () => {
    const MERGED = mergeDisplayRows(
        [
            {
                book_id: "book-1",
                date: "2026-02-10",
                finish: false,
                session_index: 1,
            },
            {
                book_id: "book-3",
                date: "2026-02-10",
                finish: false,
                session_index: 2,
            },
        ],
        [{ book_id: "book-2", date: "2026-02-10", finish: true, minutes: 0 }],
    );

    assert.deepEqual(
        MERGED.map((row) => row.book_id),
        ["book-2", "book-1", "book-3"],
    );
});
