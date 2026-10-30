// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers finish dates taken from completed Kobo records, including local day boundaries. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { syncFinishedDay } from "../dist/renderer/sync/completion.js";
import {
    applySyncImport,
    prepareSyncImport,
} from "../dist/renderer/sync/import.js";
import {
    actionableSyncEntries,
    assessSyncProgress,
    syncReviewEntries,
} from "../dist/renderer/sync/model.js";

// biome-ignore lint/style/noProcessEnv: Pins the timezone so local day boundaries are deterministic.
process.env.TZ = "America/New_York";

const RECORD = {
    dateLastRead: "2026-03-02T03:30:00Z",
    percentRead: 100,
    provider: "kobo",
    sourceId: "dune",
    title: "Dune",
};
const LOCAL_DAY = "2026-03-01";

function book(fields) {
    return normalizeBook({
        book_id: "dune",
        pages_total: 400,
        title: "Dune",
        ...fields,
    });
}

function finishedBook(finishedAt) {
    return book({
        finished_at: finishedAt,
        pages_read: 400,
        progress_percent: 100,
        progress_updated_at: "2026-02-01T12:00:00Z",
        status: "read",
    });
}

function imported(target, record = RECORD) {
    return prepareSyncImport([target], [{ bookId: "dune", record }]);
}

test("finish dates use the local calendar day, not the UTC date", () => {
    assert.equal(syncFinishedDay(RECORD), LOCAL_DAY);
    assert.equal(
        syncFinishedDay({
            ...RECORD,
            dateLastRead: "2026-03-01T23:30:00-05:00",
        }),
        LOCAL_DAY,
    );
});

test("invalid, unzoned, future, or partial records produce no finish date", () => {
    for (const DATE_LAST_READ of [
        "2026-03-02T03:30:00",
        "not a date",
        "2999-01-01T00:00:00Z",
    ]) {
        assert.equal(
            syncFinishedDay({ ...RECORD, dateLastRead: DATE_LAST_READ }),
            null,
        );
    }
    assert.equal(syncFinishedDay({ ...RECORD, percentRead: 99 }), null);
});

test("a new completion takes Kobo's local last-read day", () => {
    const RESULT = imported(book({ progress_percent: 40 }));
    assert.equal(RESULT.books[0].status, "read");
    assert.equal(RESULT.books[0].finished_at, LOCAL_DAY);
});

test("an already-complete book without a finish date gets an actionable update", () => {
    const TARGET = finishedBook(null);
    const ASSESSMENT = assessSyncProgress(RECORD, TARGET);
    assert.equal(ASSESSMENT.kind, "ready");
    assert.match(ASSESSMENT.reason, /2026-03-01/);
    const UPDATED = imported(TARGET).books[0];
    assert.equal(UPDATED.finished_at, LOCAL_DAY);
    assert.equal(UPDATED.progress_updated_at, TARGET.progress_updated_at);
    assert.equal(UPDATED.pages_read, TARGET.pages_read);
});

test("a matching finish date is a plain link", () => {
    assert.deepEqual(assessSyncProgress(RECORD, finishedBook(LOCAL_DAY)), {
        kind: "link",
        reason: "",
    });
});

test("a different existing finish date requires review before replacement", () => {
    const TARGET = finishedBook("2026-02-14");
    const ASSESSMENT = assessSyncProgress(RECORD, TARGET);
    assert.equal(ASSESSMENT.kind, "review");
    assert.match(ASSESSMENT.reason, /2026-02-14.*2026-03-01/);
    assert.equal(imported(TARGET).books[0].finished_at, LOCAL_DAY);
});

test("completing a book marked read below 100% reviews its different finish date", () => {
    const TARGET = book({
        finished_at: "2026-02-14",
        progress_percent: 90,
        status: "read",
    });
    assert.equal(assessSyncProgress(RECORD, TARGET).kind, "review");
    assert.equal(imported(TARGET).books[0].finished_at, LOCAL_DAY);
});

test("an unzoned source time links without changing the finish date", () => {
    const SOURCE = { ...RECORD, dateLastRead: "2026-03-02T03:30:00" };
    const TARGET = finishedBook("2026-02-14");
    const ASSESSMENT = assessSyncProgress(SOURCE, TARGET);
    assert.equal(ASSESSMENT.kind, "link");
    assert.match(ASSESSMENT.reason, /timezone/);
    assert.equal(imported(TARGET, SOURCE).books[0].finished_at, "2026-02-14");
});

test("repeated syncs and later manual date edits do not re-offer the completion", () => {
    const UPDATED = imported(finishedBook(null)).books[0];
    assert.equal(
        actionableSyncEntries(syncReviewEntries([RECORD], [UPDATED])).length,
        0,
    );
    const EDITED = { ...UPDATED, finished_at: "2026-02-20" };
    assert.equal(assessSyncProgress(RECORD, EDITED).kind, "link");
    assert.equal(
        actionableSyncEntries(syncReviewEntries([RECORD], [EDITED])).length,
        0,
    );
});

test("failed persistence restores the previous finish date", async () => {
    let books = [finishedBook(null)];
    const STORE = {
        changed: () => undefined,
        flush: async () => await Promise.resolve(true),
        getBooks: () => books,
        replaceBooks: (next) => {
            books = next;
        },
        save: async () => await Promise.resolve(false),
    };
    await assert.rejects(
        applySyncImport(STORE, [{ bookId: "dune", record: RECORD }]),
        /restored/,
    );
    assert.equal(books[0].finished_at, null);
    assert.equal(books[0].sync_links, undefined);
});
