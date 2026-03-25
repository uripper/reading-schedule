// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
/**
 * Verifies calendar detail rows dispatch through the correct per-day builders.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionItemsForMode } from "../dist/renderer/calendar/details_items_for_mode.js";

const NOOP = () => undefined;

/**
 * Builds a calendar row fixture with stable defaults.
 * @param {Record<string, unknown>} overrides - Optional field overrides.
 * @returns {Record<string, unknown>} Calendar row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: "2026-02-24",
        finish: false,
        minutes: 15,
        session_index: 1,
        title: "Book 1",
        words_planned: 1500,
        ...overrides,
    };
}

/**
 * Builds minimal detail interaction handlers for renderer-dispatch tests.
 * @returns {object} Handler set.
 */
function interactionHandlers() {
    return {
        getBookById: () => null,
        isSessionCompleted: () => false,
        listSessionBooks: () => [],
        onManualSessionAdded: () => false,
        onSessionCompletionChanged: NOOP,
        onSessionMinutesUpdated: () => false,
        onSessionProgressUpdated: () => null,
        onSessionRemoved: () => false,
    };
}

/**
 * Builds row-mode dispatch builders that record which path was used.
 * @param {string[]} calls - Mutable call log.
 * @returns {{
 *   future: (...args: unknown[]) => string,
 *   past: (...args: unknown[]) => string,
 *   today: (...args: unknown[]) => string,
 * }} Fake builder set.
 */
function builders(calls) {
    return {
        future: ({ row }) => {
            calls.push(`future:${row.book_id}`);
            return `future:${row.book_id}`;
        },
        past: (entry) => {
            calls.push(`past:${entry.book_id}`);
            return `past:${entry.book_id}`;
        },
        today: ({ row }) => {
            calls.push(`today:${row.book_id}`);
            return `today:${row.book_id}`;
        },
    };
}

/**
 * Builds minimal calendar details state for renderer-dispatch tests.
 * @param {Array<Record<string, unknown>>} rows - Selected-day rows.
 * @returns {object} Details state.
 */
function state(rows) {
    return {
        dates: { "2026-02-24": rows },
        expectedFinishHighlightDate: "",
        rows,
        selectedDate: "2026-02-24",
        totalsByBookId: {},
    };
}

test("buildSessionItemsForMode uses future builders for future days", () => {
    const CALLS = [];
    const ROWS = [row({ book_id: "book-a" }), row({ book_id: "book-b" })];

    const ITEMS = buildSessionItemsForMode({
        builders: builders(CALLS),
        interactionHandlers: interactionHandlers(),
        mode: "future",
        rerenderDetails: NOOP,
        rows: ROWS,
        state: state(ROWS),
    });

    assert.deepEqual(CALLS, ["future:book-a", "future:book-b"]);
    assert.deepEqual(ITEMS, ["future:book-a", "future:book-b"]);
});

test("buildSessionItemsForMode uses today builders for today rows", () => {
    const CALLS = [];
    const ROWS = [row({ book_id: "book-today" })];

    const ITEMS = buildSessionItemsForMode({
        builders: builders(CALLS),
        interactionHandlers: interactionHandlers(),
        mode: "today",
        rerenderDetails: NOOP,
        rows: ROWS,
        state: state(ROWS),
    });

    assert.deepEqual(CALLS, ["today:book-today"]);
    assert.deepEqual(ITEMS, ["today:book-today"]);
});

test("buildSessionItemsForMode uses past builders for past rows", () => {
    const CALLS = [];
    const ROWS = [row({ book_id: "book-past" })];

    const ITEMS = buildSessionItemsForMode({
        builders: builders(CALLS),
        interactionHandlers: interactionHandlers(),
        mode: "past",
        rerenderDetails: NOOP,
        rows: ROWS,
        state: state(ROWS),
    });

    assert.deepEqual(CALLS, ["past:book-past"]);
    assert.deepEqual(ITEMS, ["past:book-past"]);
});
