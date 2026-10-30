// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Ensures all editing and persistence paths retain progress ordering metadata. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePreferences } from "../dist/renderer/app/experience/model.js";
import { applyBulkBookUpdates } from "../dist/renderer/books/bulk-edit-updates.js";
import { updatedProgressBook } from "../dist/renderer/books/controller-progress.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { toPayloadBook } from "../dist/renderer/books/model-payload.js";
import { upsertBookById } from "../dist/renderer/books/save.js";

const SOURCE = {
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "source",
    title: "Book",
};

function importedBook() {
    return normalizeBook({
        book_id: "book",
        pages_read: 120,
        pages_total: 200,
        progress_percent: 60,
        progress_updated_at: SOURCE.dateLastRead,
        sync_links: [SOURCE],
        title: "Book",
    });
}

test("normalization and payload serialization retain imported history", () => {
    const BOOK = toPayloadBook(normalizeBook(importedBook()));
    assert.deepEqual(BOOK.sync_links, [SOURCE]);
    assert.equal(BOOK.progress_updated_at, SOURCE.dateLastRead);
});

test("legacy Kobo history migrates to a device-agnostic source link", () => {
    const { provider: _provider, sourceId, ...FIELDS } = SOURCE;
    const LEGACY = normalizeBook({
        book_id: "legacy",
        kobo_progress: { ...FIELDS, contentId: sourceId },
        title: "Book",
    });
    assert.deepEqual(LEGACY.sync_links, [SOURCE]);
    assert.equal("kobo_progress" in LEGACY, false);
    assert.deepEqual(normalizeBook(LEGACY).sync_links, [SOURCE]);
});

test("malformed links are dropped without discarding valid ones", () => {
    const BOOK = normalizeBook({
        book_id: "mixed",
        sync_links: [SOURCE, { provider: "kobo" }, null],
        title: "Book",
    });
    assert.deepEqual(BOOK.sync_links, [SOURCE]);
});

test("manual progress updates get a new timestamp while retaining the imported record", () => {
    const BEFORE = new Date().toISOString();
    const BOOK = updatedProgressBook(
        importedBook(),
        { progressPercent: 70 },
        {},
    );
    assert.ok(BOOK.progress_updated_at >= BEFORE);
    assert.deepEqual(BOOK.sync_links, [SOURCE]);
});

test("metadata-only dialog edits preserve history even if form payload omits it", () => {
    const BOOK = importedBook();
    const EDITED = normalizeBook({
        ...BOOK,
        progress_updated_at: undefined,
        sync_links: undefined,
        title: "Renamed",
    });
    const SAVED = upsertBookById([BOOK], EDITED)[0];
    assert.equal(SAVED.progress_updated_at, SOURCE.dateLastRead);
    assert.deepEqual(SAVED.sync_links, [SOURCE]);
});

test("dialog and bulk progress edits update time; bulk shelf edits do not", () => {
    const BOOK = importedBook();
    const CHANGED = upsertBookById([BOOK], {
        ...BOOK,
        pages_read: 140,
        progress_percent: 70,
    })[0];
    assert.notEqual(CHANGED.progress_updated_at, SOURCE.dateLastRead);
    const SHELF = applyBulkBookUpdates([BOOK], [BOOK.book_id], {
        shelf: "New",
    })[0];
    assert.equal(SHELF.progress_updated_at, SOURCE.dateLastRead);
    const FINISHED = applyBulkBookUpdates([BOOK], [BOOK.book_id], {
        status: "read",
    })[0];
    assert.notEqual(FINISHED.progress_updated_at, SOURCE.dateLastRead);
});

test("configured database paths survive preference normalization", () => {
    assert.equal(
        normalizePreferences({ koboDatabasePath: " /kobo/KoboReader.sqlite " })
            .koboDatabasePath,
        "/kobo/KoboReader.sqlite",
    );
    assert.equal(normalizePreferences().koboDatabasePath, undefined);
});

test("new books with manually entered progress receive an update timestamp", () => {
    const BOOK = normalizeBook({
        book_id: "new",
        progress_percent: 20,
        title: "New",
    });
    const SAVED = upsertBookById([], BOOK)[0];
    assert.ok(SAVED.progress_updated_at);
    assert.equal(normalizeBook(BOOK).progress_updated_at, undefined);
});
