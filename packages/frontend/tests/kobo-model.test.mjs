// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers Kobo matching, freshness, source replays, and approved progress mutations. */
import assert from "node:assert/strict";
import test from "node:test";
import { parseKoboSnapshot } from "@reading-schedule/contracts";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { prepareKoboImport } from "../dist/renderer/kobo/import.js";
import {
    actionableKoboEntries,
    assessKoboProgress,
    koboReviewEntries,
} from "../dist/renderer/kobo/model.js";

const READ_TIME = "2026-02-02T12:00:00Z";
const SOURCE = {
    contentId: "kobo-1",
    dateLastRead: READ_TIME,
    percentRead: 60,
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
    const ENTRIES = koboReviewEntries(
        [SOURCE],
        [BOOK, book({ book_id: "other" })],
    );
    assert.equal(ENTRIES[0].matches.length, 2);
    assert.equal(
        koboReviewEntries([SOURCE], [book({ title: "Other" })])[0].matches
            .length,
        0,
    );
});

test("previously imported source identity survives a Bartleby title edit", () => {
    const LINKED = book({ kobo_progress: SOURCE, title: "Renamed" });
    const ENTRIES = koboReviewEntries([SOURCE], [book(), LINKED]);
    assert.deepEqual(ENTRIES[0].matches, [LINKED]);
});

test("multiple Kobo records targeting one library book require source review", () => {
    const ENTRIES = koboReviewEntries(
        [SOURCE, { ...SOURCE, contentId: "duplicate" }],
        [book()],
    );
    assert.ok(ENTRIES.every((entry) => entry.requiresSourceReview));
});

test("first imports are eligible while older and invalid source times are blocked", () => {
    assert.equal(assessKoboProgress(SOURCE, book()).kind, "ready");
    const NEWER = book({ progress_updated_at: "2026-02-03T12:00:00Z" });
    assert.equal(assessKoboProgress(SOURCE, NEWER).kind, "blocked");
    for (const DATE of [
        "invalid",
        "2026-02-30T12:00:00Z",
        "2026-02-02T12:00:00",
        "2999-02-02T12:00:00Z",
    ]) {
        assert.equal(
            assessKoboProgress({ ...SOURCE, dateLastRead: DATE }, book()).kind,
            "blocked",
        );
    }
});

test("offset timestamps compare by instant; ties, legacy values and decreases need review", () => {
    const TIED = book({ progress_updated_at: "2026-02-02T05:00:00-07:00" });
    assert.equal(assessKoboProgress(SOURCE, TIED).kind, "review");
    assert.equal(
        assessKoboProgress(
            SOURCE,
            book({ pages_read: 40, progress_percent: 20 }),
        ).kind,
        "review",
    );
    assert.equal(
        assessKoboProgress(
            SOURCE,
            book({ pages_read: 160, progress_percent: 80 }),
        ).kind,
        "review",
    );
});

test("unchanged and already imported source records are not proposed again", () => {
    const IMPORTED = prepareKoboImport(
        [book()],
        [{ bookId: "book-1", record: SOURCE }],
    ).books[0];
    assert.equal(IMPORTED.progress_percent, 60);
    assert.equal(IMPORTED.pages_read, 120);
    assert.equal(IMPORTED.status, "in_progress");
    assert.deepEqual(IMPORTED.kobo_progress, SOURCE);
    assert.equal(IMPORTED.progress_updated_at, READ_TIME);
    assert.equal(
        actionableKoboEntries(koboReviewEntries([SOURCE], [IMPORTED])).length,
        0,
    );
});

test("replays remain ignored after local progress changes and Kobo page rounding", () => {
    const BOOK = book({
        kobo_progress: SOURCE,
        pages_read: 180,
        progress_percent: 90,
    });
    assert.equal(assessKoboProgress(SOURCE, BOOK).kind, "unchanged");
    assert.equal(
        prepareKoboImport([BOOK], [{ bookId: "book-1", record: SOURCE }])
            .imported,
        0,
    );
});

test("only chosen valid books update; missing and newly stale choices are reported", () => {
    const OTHER = book({
        book_id: "other",
        progress_updated_at: "2026-02-03T12:00:00Z",
    });
    const RESULT = prepareKoboImport(
        [book(), OTHER],
        [
            { bookId: "book-1", record: SOURCE },
            { bookId: "other", record: { ...SOURCE, contentId: "other" } },
            { bookId: "missing", record: { ...SOURCE, contentId: "missing" } },
        ],
    );
    assert.equal(RESULT.imported, 1);
    assert.equal(RESULT.failed.length, 2);
    assert.equal(RESULT.books[1], OTHER);
});

test("duplicate targets are rejected rather than applying arbitrary source order", () => {
    const CHOICE = { bookId: "book-1", record: SOURCE };
    assert.throws(
        () => prepareKoboImport([book()], [CHOICE, CHOICE]),
        /same book/,
    );
});

test("completion uses source reading date and preserves read status", () => {
    const RECORD = { ...SOURCE, percentRead: 100 };
    const RESULT = prepareKoboImport(
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
