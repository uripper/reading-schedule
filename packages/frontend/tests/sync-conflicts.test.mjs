// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Ensures warnings identify the actual competing source records and library books. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareSyncImport } from "../dist/renderer/sync/import.js";
import {
    assessSyncProgress,
    syncReviewEntries,
} from "../dist/renderer/sync/model.js";
import { syncReviewConflicts } from "../dist/renderer/sync/review-conflicts.js";

const BOOK = normalizeBook({ book_id: "frank", title: "Frankenstein" });
const RECORD = {
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "one",
    title: "Frankenstien",
};
const OTHER = {
    ...RECORD,
    percentRead: 80,
    provider: "kobo",
    sourceId: "two",
    title: "Frankenstein: Illustrated Edition",
};

test("source collisions name the other source title and its percentage", () => {
    const ENTRIES = syncReviewEntries([RECORD, OTHER], [BOOK]);
    const NOTE = syncReviewConflicts(
        ENTRIES[0],
        BOOK,
        assessSyncProgress(RECORD, BOOK),
    );
    assert.ok(NOTE.includes(BOOK.title));
    assert.ok(NOTE.includes(OTHER.title));
    assert.ok(NOTE.includes("80%"));
    assert.deepEqual(ENTRIES[0].conflictingRecords, [OTHER]);
    assert.deepEqual(ENTRIES[1].conflictingRecords, [RECORD]);
});

test("ambiguous editions name the alternative author and shelf", () => {
    const OTHER_BOOK = normalizeBook({
        ...BOOK,
        author: "Other editor",
        book_id: "edition",
        shelf: "Classics",
    });
    const ENTRY = syncReviewEntries(
        [{ ...RECORD, title: "Frankenstein" }],
        [BOOK, OTHER_BOOK],
    )[0];
    const NOTE = syncReviewConflicts(ENTRY, BOOK, {
        kind: "ready",
        reason: "",
    });
    assert.ok(NOTE.includes("Other editor"));
    assert.ok(NOTE.includes("Classics"));
});

test("ordinary and equal-progress matches have no instructional copy", () => {
    const ENTRY = syncReviewEntries([RECORD], [BOOK])[0];
    assert.equal(
        syncReviewConflicts(ENTRY, BOOK, { kind: "ready", reason: "" }),
        "",
    );
    assert.equal(
        syncReviewConflicts(ENTRY, BOOK, { kind: "link", reason: "" }),
        "",
    );
});

test("import conflict errors identify the competing Kobo titles and selected library book", () => {
    assert.throws(
        () =>
            prepareSyncImport(
                [BOOK],
                [
                    { bookId: BOOK.book_id, record: RECORD },
                    { bookId: BOOK.book_id, record: OTHER },
                ],
            ),
        (error) =>
            error.message.includes(RECORD.title) &&
            error.message.includes(OTHER.title) &&
            error.message.includes(BOOK.title),
    );
});
