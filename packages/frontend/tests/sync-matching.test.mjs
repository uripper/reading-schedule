// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers ranked suggestions and searching the entire local library. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { normalizeKoboTitle } from "../dist/renderer/kobo/match-score.js";
import {
    matchKoboRecord,
    rankKoboLibrary,
} from "../dist/renderer/kobo/matching.js";
import { koboReviewEntries } from "../dist/renderer/kobo/model.js";

function book(title, bookId = title, author = "") {
    return normalizeBook({ author, book_id: bookId, title });
}

function source(title) {
    return {
        contentId: "kobo",
        dateLastRead: "2026-02-01T12:00:00Z",
        percentRead: 60,
        title,
    };
}

test("normalizes accents, punctuation, hyphens, and connecting words", () => {
    assert.equal(normalizeKoboTitle("  The Móby-Dick!  "), "moby dick");
    const ENTRY = matchKoboRecord(source("Pride & Prejudice"), [
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
        matchKoboRecord(source("Frankenstien"), LIBRARY).suggestedBookId,
        "Frankenstein",
    );
    assert.equal(
        matchKoboRecord(source("Moby Dick; or, The Whale"), LIBRARY)
            .suggestedBookId,
        "Moby-Dick",
    );
});

test("preselects the most likely candidate but requires review for ties or duplicate editions", () => {
    const LIBRARY = [
        book("Harry Potter and the Chamber of Secrets"),
        book("Harry Potter and the Goblet of Fire"),
    ];
    const ENTRY = matchKoboRecord(source("Harry Potter"), LIBRARY);
    assert.equal(ENTRY.matches.length, 2);
    assert.equal(ENTRY.suggestedBookId, ENTRY.matches[0].book_id);
    assert.equal(ENTRY.requiresMatchReview, true);
    assert.equal(
        matchKoboRecord(source("Dune"), [
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
        rankKoboLibrary("le guin", LIBRARY)[0].book.book_id,
        "left-hand",
    );
    assert.equal(
        rankKoboLibrary("darkn", LIBRARY)[0].book.book_id,
        "left-hand",
    );
    assert.deepEqual(
        rankKoboLibrary("", LIBRARY).map((match) => match.book.title),
        ["Moby-Dick", "The Left Hand of Darkness"],
    );
});

test("approved source links win over fuzzy suggestions after a manual match", () => {
    const RECORD = source("Completely different device title");
    const BOOK = { ...book("Library edition"), kobo_progress: RECORD };
    assert.equal(matchKoboRecord(RECORD, [BOOK]).suggestedBookId, BOOK.book_id);
    assert.equal(matchKoboRecord(RECORD, [BOOK]).matchKind, "linked");
});

test("different fuzzy records targeting the same book require individual approval", () => {
    const ENTRIES = koboReviewEntries(
        [
            source("Frankenstien"),
            {
                ...source("Frankenstein: illustrated edition"),
                contentId: "other",
            },
        ],
        [book("Frankenstein")],
    );
    assert.ok(ENTRIES.every((entry) => entry.requiresSourceReview));
});

test("unrelated titles remain unresolved instead of guessing", () => {
    const ENTRY = matchKoboRecord(source("XYZ"), [
        book("Dune"),
        book("Moby-Dick"),
    ]);
    assert.equal(ENTRY.matches.length, 0);
    assert.equal(ENTRY.matchKind, "none");
    assert.equal(ENTRY.suggestedBookId, null);
});
