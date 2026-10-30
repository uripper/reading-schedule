// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers equal-progress confirmations without changing reading history. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareSyncImport } from "../dist/renderer/sync/import.js";
import {
    actionableSyncEntries,
    assessSyncProgress,
    syncReviewEntries,
} from "../dist/renderer/sync/model.js";

const RECORD = {
    dateLastRead: "2026-10-01T12:00:00Z",
    percentRead: 100,
    provider: "kobo",
    sourceId: "hamlet",
    title: "Hamlet",
};
const BOOK = normalizeBook({
    book_id: "library-hamlet",
    finished_at: "2026-10-01",
    pages_read: 200,
    pages_total: 200,
    progress_percent: 100,
    progress_updated_at: "2026-10-29T12:00:00Z",
    title: "Hamlet",
});

test("equal percentages remain actionable even when Kobo's record is older", () => {
    assert.equal(assessSyncProgress(RECORD, BOOK).kind, "link");
    assert.equal(
        actionableSyncEntries(syncReviewEntries([RECORD], [BOOK])).length,
        1,
    );
});

test("confirmation saves the association without rewriting pages, finish date, or update time", () => {
    const RESULT = prepareSyncImport(
        [BOOK],
        [{ bookId: BOOK.book_id, record: RECORD }],
    );
    const LINKED = RESULT.books[0];
    assert.equal(RESULT.imported, 1);
    assert.equal(LINKED.progress_percent, BOOK.progress_percent);
    assert.equal(LINKED.pages_read, BOOK.pages_read);
    assert.equal(LINKED.finished_at, BOOK.finished_at);
    assert.equal(LINKED.progress_updated_at, BOOK.progress_updated_at);
    assert.deepEqual(LINKED.sync_links, [RECORD]);
    assert.equal(
        actionableSyncEntries(syncReviewEntries([RECORD], [LINKED])).length,
        0,
    );
});

test("equal-progress linking does not require inventing a timezone for the device", () => {
    const SOURCE = { ...RECORD, dateLastRead: "2026-10-01T01:33:46.651" };
    const RESULT = prepareSyncImport(
        [BOOK],
        [{ bookId: BOOK.book_id, record: SOURCE }],
    );
    assert.equal(RESULT.imported, 1);
    assert.equal(RESULT.books[0].progress_updated_at, BOOK.progress_updated_at);
});

test("equal percentages can be confirmed again if explicitly selected in a review", () => {
    const LINKED = { ...BOOK, sync_links: [RECORD] };
    assert.equal(assessSyncProgress(RECORD, LINKED).kind, "link");
    assert.equal(
        prepareSyncImport([LINKED], [{ bookId: BOOK.book_id, record: RECORD }])
            .imported,
        1,
    );
});
