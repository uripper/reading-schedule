// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import { wordsPlannedForManualSession } from "../dist/renderer/app/calendar_interactions/calendar_interactions_manual_helpers.js";
import {
    nextSessionIndexForDate,
    rowsWithoutSession,
} from "../dist/renderer/app/calendar_interactions/calendar_interactions_row_helpers.js";
import {
    historicalPaceRowsFixture,
    indexRowsFixture,
    removableRowsFixture,
} from "./calendar-manual-session.fixtures.mjs";

test("nextSessionIndexForDate appends after highest index on the same day", () => {
    const ROWS = indexRowsFixture();

    assert.equal(nextSessionIndexForDate(ROWS, "2026-02-20"), 4);
    assert.equal(nextSessionIndexForDate(ROWS, "2026-02-21"), 3);
    assert.equal(nextSessionIndexForDate(ROWS, "2026-02-22"), 1);
});

test("wordsPlannedForManualSession uses historical pace when available", () => {
    const ROWS = historicalPaceRowsFixture();

    const WORDS = wordsPlannedForManualSession({
        bookId: "book-1",
        difficulty: 3,
        minutes: 15,
        rows: ROWS,
        settings: { difficulty_multiplier: { 3: 2 }, wpm_base: 250 },
    });

    assert.equal(WORDS, 1600);
});

test("wordsPlannedForManualSession falls back to settings-based speed", () => {
    const WORDS = wordsPlannedForManualSession({
        bookId: "book-1",
        difficulty: 4,
        minutes: 12,
        rows: [],
        settings: {
            difficulty_multiplier: { 4: 0.75 },
            wpm_base: 200,
        },
    });

    assert.equal(WORDS, 1800);
});

test("rowsWithoutSession removes only the targeted row key", () => {
    const ROWS = removableRowsFixture();

    const NEXT_ROWS = rowsWithoutSession(ROWS, "2026-02-20|2|book-1");

    assert.equal(NEXT_ROWS.length, 2);
    assert.ok(
        NEXT_ROWS.some(
            (row) => row.book_id === "book-1" && row.session_index === 1,
        ),
    );
    assert.ok(
        NEXT_ROWS.some(
            (row) => row.book_id === "book-2" && row.session_index === 1,
        ),
    );
});

test("rowsWithoutSession preserves rows when session key is not found", () => {
    const ROWS = removableRowsFixture();

    const NEXT_ROWS = rowsWithoutSession(ROWS, "2026-02-20|9|missing-book");

    assert.notEqual(NEXT_ROWS, ROWS);
    assert.deepEqual(NEXT_ROWS, ROWS);
});
