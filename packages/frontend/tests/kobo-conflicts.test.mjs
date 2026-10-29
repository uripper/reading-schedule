// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Ensures warnings identify the actual competing source records and library books. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareKoboImport } from "../dist/renderer/kobo/import.js";
import {
    assessKoboProgress,
    koboReviewEntries,
} from "../dist/renderer/kobo/model.js";
import { koboReviewConflicts } from "../dist/renderer/kobo/review-conflicts.js";

const BOOK = normalizeBook({ book_id: "frank", title: "Frankenstein" });
const RECORD = {
    contentId: "one",
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    title: "Frankenstien",
};
const OTHER = {
    ...RECORD,
    contentId: "two",
    percentRead: 80,
    title: "Frankenstein: Illustrated Edition",
};

test("source collisions name the other source title and its percentage", () => {
    const ENTRIES = koboReviewEntries([RECORD, OTHER], [BOOK]);
    const NOTE = koboReviewConflicts(
        ENTRIES[0],
        BOOK,
        assessKoboProgress(RECORD, BOOK),
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
    const ENTRY = koboReviewEntries(
        [{ ...RECORD, title: "Frankenstein" }],
        [BOOK, OTHER_BOOK],
    )[0];
    const NOTE = koboReviewConflicts(ENTRY, BOOK, {
        kind: "ready",
        reason: "",
    });
    assert.ok(NOTE.includes("Other editor"));
    assert.ok(NOTE.includes("Classics"));
});

test("ordinary and equal-progress matches have no instructional copy", () => {
    const ENTRY = koboReviewEntries([RECORD], [BOOK])[0];
    assert.equal(
        koboReviewConflicts(ENTRY, BOOK, { kind: "ready", reason: "" }),
        "",
    );
    assert.equal(
        koboReviewConflicts(ENTRY, BOOK, { kind: "link", reason: "" }),
        "",
    );
});

test("import conflict errors identify the competing Kobo titles and selected library book", () => {
    assert.throws(
        () =>
            prepareKoboImport(
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
