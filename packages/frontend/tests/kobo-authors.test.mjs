// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers author-aware matching, spelling variation, and title-only fallback. */
import assert from "node:assert/strict";
import test from "node:test";
import { parseKoboSnapshot } from "@reading-schedule/contracts";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    syncAuthorAgreement,
    syncAuthorSimilarity,
} from "../dist/renderer/sync/author-match.js";
import {
    matchSyncRecord,
    rankSyncLibrary,
} from "../dist/renderer/sync/matching.js";
import { syncRecordName } from "../dist/renderer/sync/review-conflicts.js";

const RECORD = {
    author: "Fyodor Dostoyevsky",
    dateLastRead: "2026-02-02T12:00:00Z",
    percentRead: 40,
    provider: "kobo",
    sourceId: "idiot",
    title: "The Idiot",
};

function book(bookId, title, author) {
    return normalizeBook({ author, book_id: bookId, title });
}

test("author comparison tolerates order, initials, spelling, and co-authors", () => {
    assert.equal(
        syncAuthorSimilarity("Le Guin, Ursula K.", "Ursula K. Le Guin"),
        1,
    );
    assert.ok(
        syncAuthorSimilarity("Fyodor Dostoyevsky", "Fyodor Dostoevsky") >= 0.7,
    );
    assert.equal(
        syncAuthorSimilarity("Terry Pratchett & Neil Gaiman", "Neil Gaiman"),
        1,
    );
    assert.equal(syncAuthorSimilarity("", "Neil Gaiman"), null);
    assert.equal(syncAuthorSimilarity(undefined, "Neil Gaiman"), null);
});

test("duplicate titles by different authors select the matching author", () => {
    const ENTRY = matchSyncRecord(RECORD, [
        book("other", "The Idiot", "Elif Batuman"),
        book("right", "The Idiot", "Fyodor Dostoevsky"),
    ]);
    assert.equal(ENTRY.matchKind, "exact");
    assert.equal(ENTRY.suggestedBookId, "right");
    assert.equal(ENTRY.requiresMatchReview, false);
    assert.equal(ENTRY.matches.length, 2);
});

test("duplicate titles stay in review when another candidate's author is unknown", () => {
    const ENTRY = matchSyncRecord(RECORD, [
        book("blank", "The Idiot", ""),
        book("right", "The Idiot", "Fyodor Dostoevsky"),
    ]);
    assert.equal(ENTRY.suggestedBookId, "right");
    assert.equal(ENTRY.requiresMatchReview, true);
});

test("a lone exact title by a different author requires review", () => {
    const ENTRY = matchSyncRecord(RECORD, [
        book("other", "The Idiot", "Elif Batuman"),
    ]);
    assert.equal(ENTRY.suggestedBookId, "other");
    assert.equal(ENTRY.requiresMatchReview, true);
});

test("missing source or library authors keep title-only matching", () => {
    const UNKNOWN = { ...RECORD, author: undefined };
    const LIBRARY = [book("only", "The Idiot", "Elif Batuman")];
    assert.equal(syncAuthorAgreement(UNKNOWN, LIBRARY[0]), "unknown");
    assert.equal(matchSyncRecord(UNKNOWN, LIBRARY).requiresMatchReview, false);
    assert.equal(
        matchSyncRecord(RECORD, [book("only", "The Idiot", "")])
            .requiresMatchReview,
        false,
    );
    assert.equal(
        matchSyncRecord(UNKNOWN, [
            book("one", "The Idiot", "Elif Batuman"),
            book("two", "The Idiot", "Fyodor Dostoevsky"),
        ]).requiresMatchReview,
        true,
    );
});

test("fuzzy ranking prefers the edition by the source's author", () => {
    const SOURCE = { ...RECORD, title: "The Idiot: A Novel" };
    const ENTRY = matchSyncRecord(SOURCE, [
        book("other", "The Idiot", "Elif Batuman"),
        book("right", "The Idiot", "Fyodor Dostoevsky"),
    ]);
    assert.equal(ENTRY.matchKind, "fuzzy");
    assert.equal(ENTRY.suggestedBookId, "right");
});

test("library browsing uses the device author only as ranking context", () => {
    const LIBRARY = [
        book("other", "The Idiot", "Elif Batuman"),
        book("right", "The Idiot", "Fyodor Dostoevsky"),
    ];
    assert.equal(
        rankSyncLibrary("The Idiot", LIBRARY, { author: RECORD.author })[0].book
            .book_id,
        "right",
    );
    assert.equal(rankSyncLibrary("Batuman", LIBRARY)[0].book.book_id, "other");
});

test("review labels include a credited author and native payloads may omit it", () => {
    assert.equal(syncRecordName(RECORD), "The Idiot — Fyodor Dostoyevsky");
    assert.equal(syncRecordName({ ...RECORD, author: undefined }), "The Idiot");
    const { provider: _provider, sourceId, ...FIELDS } = RECORD;
    const NATIVE = { ...FIELDS, contentId: sourceId };
    const SNAPSHOT = parseKoboSnapshot({
        invalidRows: 0,
        records: [{ ...NATIVE, author: undefined }, NATIVE],
        status: "connected",
    });
    assert.equal(SNAPSHOT.records[0].author, undefined);
    assert.equal(SNAPSHOT.records[1].author, RECORD.author);
});
