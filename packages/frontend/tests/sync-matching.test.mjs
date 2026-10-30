// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers ranked suggestions and searching the entire local library. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { normalizeSyncTitle } from "../dist/renderer/sync/match-score.js";
import {
    matchSyncRecord,
    rankSyncLibrary,
} from "../dist/renderer/sync/matching.js";
import { syncReviewEntries } from "../dist/renderer/sync/model.js";

function book(title, bookId = title, author = "") {
    return normalizeBook({ author, book_id: bookId, title });
}

function source(title) {
    return {
        dateLastRead: "2026-02-01T12:00:00Z",
        percentRead: 60,
        provider: "kobo",
        sourceId: "kobo",
        title,
    };
}

test("normalizes accents, punctuation, hyphens, and connecting words", () => {
    assert.equal(normalizeSyncTitle("  The Móby-Dick!  "), "moby dick");
    const ENTRY = matchSyncRecord(source("Pride & Prejudice"), [
        book("Pride and Prejudice"),
    ]);
    assert.equal(ENTRY.matchKind, "exact");
    assert.equal(ENTRY.suggestedBookId, "Pride and Prejudice");
});

test("suggests a clear best match across spelling and subtitle differences", () => {
    const LIBRARY = [
        book("Frankenstein"),
        book("Moby-Dick"),
        book("Pride and Prejudice"),
    ];
    assert.equal(
        matchSyncRecord(source("Frankenstien"), LIBRARY).suggestedBookId,
        "Frankenstein",
    );
    assert.equal(
        matchSyncRecord(source("Moby Dick; or, The Whale"), LIBRARY)
            .suggestedBookId,
        "Moby-Dick",
    );
});

test("preselects the most likely candidate but requires review for ties or duplicate editions", () => {
    const LIBRARY = [
        book("Harry Potter and the Chamber of Secrets"),
        book("Harry Potter and the Goblet of Fire"),
    ];
    const ENTRY = matchSyncRecord(source("Harry Potter"), LIBRARY);
    assert.equal(ENTRY.matches.length, 2);
    assert.equal(ENTRY.suggestedBookId, ENTRY.matches[0].book_id);
    assert.equal(ENTRY.requiresMatchReview, true);
    assert.equal(
        matchSyncRecord(source("Dune"), [
            book("Dune", "one"),
            book("Dune", "two"),
        ]).requiresMatchReview,
        true,
    );
});

test("manual searches include authors and partial titles across all library books", () => {
    const LIBRARY = [
        book("The Left Hand of Darkness", "left-hand", "Ursula K. Le Guin"),
        book("Moby-Dick"),
    ];
    assert.equal(
        rankSyncLibrary("le guin", LIBRARY)[0].book.book_id,
        "left-hand",
    );
    assert.equal(
        rankSyncLibrary("darkn", LIBRARY)[0].book.book_id,
        "left-hand",
    );
    assert.deepEqual(
        rankSyncLibrary("", LIBRARY).map((match) => match.book.title),
        ["Moby-Dick", "The Left Hand of Darkness"],
    );
});

test("approved source links win over fuzzy suggestions after a manual match", () => {
    const RECORD = source("Completely different device title");
    const BOOK = { ...book("Library edition"), sync_links: [RECORD] };
    assert.equal(matchSyncRecord(RECORD, [BOOK]).suggestedBookId, BOOK.book_id);
    assert.equal(matchSyncRecord(RECORD, [BOOK]).matchKind, "linked");
});

test("different fuzzy records targeting the same book require individual approval", () => {
    const ENTRIES = syncReviewEntries(
        [
            source("Frankenstien"),
            {
                ...source("Frankenstein: illustrated edition"),
                provider: "kobo",
                sourceId: "other",
            },
        ],
        [book("Frankenstein")],
    );
    assert.ok(ENTRIES.every((entry) => entry.requiresSourceReview));
});

test("unrelated titles remain unresolved instead of guessing", () => {
    const ENTRY = matchSyncRecord(source("XYZ"), [
        book("Dune"),
        book("Moby-Dick"),
    ]);
    assert.equal(ENTRY.matches.length, 0);
    assert.equal(ENTRY.matchKind, "none");
    assert.equal(ENTRY.suggestedBookId, null);
});
