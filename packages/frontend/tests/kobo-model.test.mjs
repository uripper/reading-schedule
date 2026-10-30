// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers Kobo matching, freshness, source replays, and approved progress mutations. */
import assert from "node:assert/strict";
import test from "node:test";
import { parseKoboSnapshot } from "@reading-schedule/contracts";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareSyncImport } from "../dist/renderer/sync/import.js";
import {
    actionableSyncEntries,
    assessSyncProgress,
    syncReviewEntries,
} from "../dist/renderer/sync/model.js";

const READ_TIME = "2026-02-02T12:00:00Z";
const SOURCE = {
    dateLastRead: READ_TIME,
    percentRead: 60,
    provider: "kobo",
    sourceId: "kobo-1",
    title: "Moby Dick",
};

function book(overrides = {}) {
    return normalizeBook({
        book_id: "book-1",
        pages_read: 0,
        pages_total: 200,
        progress_percent: 0,
        title: SOURCE.title,
        ...overrides,
    });
}

test("matches normalized titles and retains duplicate titles for explicit resolution", () => {
    const BOOK = book({ title: "  MOBY   DICK  " });
    const ENTRIES = syncReviewEntries(
        [SOURCE],
        [BOOK, book({ book_id: "other" })],
    );
    assert.equal(ENTRIES[0].matches.length, 2);
    assert.equal(
        syncReviewEntries([SOURCE], [book({ title: "Other" })])[0].matches
            .length,
        0,
    );
});

test("previously imported source identity survives a Bartleby title edit", () => {
    const LINKED = book({ sync_links: [SOURCE], title: "Renamed" });
    const ENTRIES = syncReviewEntries([SOURCE], [book(), LINKED]);
    assert.deepEqual(ENTRIES[0].matches, [LINKED]);
});

test("multiple Kobo records targeting one library book require source review", () => {
    const ENTRIES = syncReviewEntries(
        [SOURCE, { ...SOURCE, sourceId: "duplicate" }],
        [book()],
    );
    assert.ok(ENTRIES.every((entry) => entry.requiresSourceReview));
});

test("first imports are eligible while older and invalid source times are blocked", () => {
    assert.equal(assessSyncProgress(SOURCE, book()).kind, "ready");
    const NEWER = book({ progress_updated_at: "2026-02-03T12:00:00Z" });
    assert.equal(assessSyncProgress(SOURCE, NEWER).kind, "blocked");
    for (const DATE of [
        "invalid",
        "2026-02-30T12:00:00Z",
        "2026-02-02T12:00:00",
        "2999-02-02T12:00:00Z",
    ]) {
        assert.equal(
            assessSyncProgress({ ...SOURCE, dateLastRead: DATE }, book()).kind,
            "blocked",
        );
    }
});

test("offset timestamps compare by instant; ties, legacy values and decreases need review", () => {
    const TIED = book({ progress_updated_at: "2026-02-02T05:00:00-07:00" });
    assert.equal(assessSyncProgress(SOURCE, TIED).kind, "review");
    assert.equal(
        assessSyncProgress(
            SOURCE,
            book({ pages_read: 40, progress_percent: 20 }),
        ).kind,
        "review",
    );
    assert.equal(
        assessSyncProgress(
            SOURCE,
            book({ pages_read: 160, progress_percent: 80 }),
        ).kind,
        "review",
    );
});

test("unchanged and already imported source records are not proposed again", () => {
    const IMPORTED = prepareSyncImport(
        [book()],
        [{ bookId: "book-1", record: SOURCE }],
    ).books[0];
    assert.equal(IMPORTED.progress_percent, 60);
    assert.equal(IMPORTED.pages_read, 120);
    assert.equal(IMPORTED.status, "in_progress");
    assert.deepEqual(IMPORTED.sync_links, [SOURCE]);
    assert.equal(IMPORTED.progress_updated_at, READ_TIME);
    assert.equal(
        actionableSyncEntries(syncReviewEntries([SOURCE], [IMPORTED])).length,
        0,
    );
});

test("replays remain ignored after local progress changes and Kobo page rounding", () => {
    const BOOK = book({
        pages_read: 180,
        progress_percent: 90,
        sync_links: [SOURCE],
    });
    assert.equal(assessSyncProgress(SOURCE, BOOK).kind, "unchanged");
    assert.equal(
        prepareSyncImport([BOOK], [{ bookId: "book-1", record: SOURCE }])
            .imported,
        0,
    );
});

test("only chosen valid books update; missing and newly stale choices are reported", () => {
    const OTHER = book({
        book_id: "other",
        progress_updated_at: "2026-02-03T12:00:00Z",
    });
    const RESULT = prepareSyncImport(
        [book(), OTHER],
        [
            { bookId: "book-1", record: SOURCE },
            { bookId: "other", record: { ...SOURCE, sourceId: "other" } },
            { bookId: "missing", record: { ...SOURCE, sourceId: "missing" } },
        ],
    );
    assert.equal(RESULT.imported, 1);
    assert.equal(RESULT.failed.length, 2);
    assert.equal(RESULT.books[1], OTHER);
});

test("duplicate targets are rejected rather than applying arbitrary source order", () => {
    const CHOICE = { bookId: "book-1", record: SOURCE };
    assert.throws(
        () => prepareSyncImport([book()], [CHOICE, CHOICE]),
        /same book/,
    );
});

test("completion uses source reading date and preserves read status", () => {
    const RECORD = { ...SOURCE, percentRead: 100 };
    const RESULT = prepareSyncImport(
        [book()],
        [{ bookId: "book-1", record: RECORD }],
    );
    assert.equal(RESULT.books[0].status, "read");
    assert.equal(RESULT.books[0].finished_at, "2026-02-02");
});

test("validates native responses and rejects invalid percentage ranges", () => {
    assert.equal(
        parseKoboSnapshot({ status: "disconnected" }).status,
        "disconnected",
    );
    assert.throws(() =>
        parseKoboSnapshot({
            invalidRows: 0,
            records: [{ ...SOURCE, percentRead: 101 }],
            status: "connected",
        }),
    );
});
