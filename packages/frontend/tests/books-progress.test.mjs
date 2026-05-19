// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { withUpdatedProgress } from "../dist/renderer/books/progress.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "../dist/renderer/books/status_catalog.js";

function book(overrides = {}) {
    return {
        book_id: "book-1",
        pages_read: 340,
        pages_total: 340,
        progress_percent: 100,
        status: BOOK_STATUS_READ,
        title: "Read Book",
        ...overrides,
    };
}

test("withUpdatedProgress demotes stale read status when progress drops below complete", () => {
    const UPDATED = withUpdatedProgress(book(), { pagesRead: 264 });

    assert.equal(UPDATED.status, BOOK_STATUS_IN_PROGRESS);
    assert.equal(UPDATED.pages_read, 264);
});

test("withUpdatedProgress demotes stale read status to to-read at zero progress", () => {
    const UPDATED = withUpdatedProgress(
        book({ pages_read: 0, pages_total: null, progress_percent: 100 }),
        { progressPercent: 0 },
    );

    assert.equal(UPDATED.status, BOOK_STATUS_TO_READ);
});

test("withUpdatedProgress promotes to-read when pages read are set", () => {
    const UPDATED = withUpdatedProgress(
        book({
            pages_read: 0,
            pages_total: 340,
            progress_percent: 0,
            status: BOOK_STATUS_TO_READ,
        }),
        { pagesRead: 17 },
    );

    assert.equal(UPDATED.status, BOOK_STATUS_IN_PROGRESS);
});

test("withUpdatedProgress promotes to-read when percent is set", () => {
    const UPDATED = withUpdatedProgress(
        book({
            pages_read: null,
            pages_total: null,
            progress_percent: 0,
            status: BOOK_STATUS_TO_READ,
        }),
        { progressPercent: 4 },
    );

    assert.equal(UPDATED.status, BOOK_STATUS_IN_PROGRESS);
});
