import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBook } from "../dist/renderer/books/model.js";
import { applyScheduledDaysToShelfBooks } from "../dist/renderer/books/save_scheduled_days.js";
import { BOOK_WEEKDAYS } from "../dist/renderer/books/scheduled_days.js";

/**
 * Builds canonical book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture object.
 */
function book(overrides = {}) {
    return {
        author: "",
        blocked_by: null,
        book_id: "book-1",
        cover_local_path: "",
        cover_url: "",
        deadline: null,
        difficulty: 3,
        finished_at: null,
        lookup_note: "",
        max_minutes_per_day: null,
        min_blocks_per_session: 1,
        pages_read: null,
        pages_total: null,
        priority: 3,
        progress_percent: 0,
        scheduled_days: [...BOOK_WEEKDAYS],
        shelf: "",
        status: "to_read",
        title: "Book",
        words_total: 1000,
        ...overrides,
    };
}

test("normalizeBook defaults scheduled days to all weekdays", () => {
    const NORMALIZED = normalizeBook({
        title: "Default Days",
        words_total: 1000,
    });

    assert.deepEqual(NORMALIZED.scheduled_days, BOOK_WEEKDAYS);
});

test("normalizeBook normalizes scheduled-day order and removes invalid values", () => {
    const NORMALIZED = normalizeBook({
        scheduled_days: ["Fri", "Mon", "Fri", "BadDay"],
        title: "Ordered Days",
        words_total: 1000,
    });

    assert.deepEqual(NORMALIZED.scheduled_days, ["Mon", "Fri"]);
});

test("applyScheduledDaysToShelfBooks updates only matching shelf books", () => {
    const NEXT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const SOURCE = book({
        book_id: "work-1",
        scheduled_days: NEXT_DAYS,
        shelf: "Work",
    });
    const BOOKS = [
        SOURCE,
        book({ book_id: "work-2", scheduled_days: ["Sat"], shelf: "Work" }),
        book({ book_id: "home-1", scheduled_days: ["Sat"], shelf: "Home" }),
    ];

    const RESULT = applyScheduledDaysToShelfBooks(BOOKS, SOURCE);
    assert.deepEqual(RESULT[0].scheduled_days, NEXT_DAYS);
    assert.deepEqual(RESULT[1].scheduled_days, NEXT_DAYS);
    assert.deepEqual(RESULT[2].scheduled_days, ["Sat"]);
});
