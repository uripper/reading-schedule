// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    buildCompletedBookRowsByDate,
    finishedBooksSummaryText,
} from "../dist/renderer/calendar/finished_books.js";

test("buildCompletedBookRowsByDate groups rows by finished date", () => {
    const ROWS_BY_DATE = buildCompletedBookRowsByDate(
        [
            { bookId: "book-1", title: "Fallback One" },
            { bookId: "book-2", title: "Fallback Two" },
        ],
        (bookId) => {
            if (bookId === "book-1") {
                return { finished_at: "2026-02-17", title: "Oedipus Rex" };
            }
            if (bookId === "book-2") {
                return { finished_at: "2026-02-18", title: "Medea" };
            }
            return null;
        },
    );

    assert.equal(ROWS_BY_DATE["2026-02-17"]?.length, 1);
    assert.equal(ROWS_BY_DATE["2026-02-17"]?.[0]?.title, "Oedipus Rex");
    assert.equal(ROWS_BY_DATE["2026-02-18"]?.length, 1);
    assert.equal(ROWS_BY_DATE["2026-02-18"]?.[0]?.title, "Medea");
});

test("buildCompletedBookRowsByDate deduplicates repeated session-book ids", () => {
    const ROWS_BY_DATE = buildCompletedBookRowsByDate(
        [
            { bookId: "book-1", title: "Fallback One" },
            { bookId: "book-1", title: "Fallback One Duplicate" },
        ],
        () => {
            return { finished_at: "2026-02-17", title: "Oedipus Rex" };
        },
    );

    assert.equal(ROWS_BY_DATE["2026-02-17"]?.length, 1);
});

test("finishedBooksSummaryText returns de-duplicated summary text", () => {
    const SUMMARY = finishedBooksSummaryText([
        {
            book_id: "book-1",
            date: "2026-02-17",
            finish: true,
            minutes: 0,
            title: "Oedipus Rex",
        },
        {
            book_id: "book-2",
            date: "2026-02-17",
            finish: true,
            minutes: 0,
            title: "Oedipus Rex",
        },
        {
            book_id: "book-3",
            date: "2026-02-17",
            finish: true,
            minutes: 0,
            title: "The Bacchae",
        },
    ]);

    assert.equal(SUMMARY, "Finished: Oedipus Rex, The Bacchae");
});

test("finishedBooksSummaryText returns empty text when rows are untitled", () => {
    const SUMMARY = finishedBooksSummaryText([
        {
            book_id: "book-1",
            date: "2026-02-17",
            finish: true,
            minutes: 0,
            title: "   ",
        },
    ]);

    assert.equal(SUMMARY, "");
});
