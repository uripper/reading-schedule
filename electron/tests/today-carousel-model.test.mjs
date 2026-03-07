/**
 * Verifies Today carousel model fallbacks and row-local UI state cleanup.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { buildTodayCarouselModel } from "../dist/renderer/app/today/today_carousel_model.js";
import {
    clearTodayCarouselRowState,
    closeMinutesEditor,
    minutesEditor,
    openMinutesEditor,
    pinnedRowKeySnapshot,
    pinRowKey,
    progressDraft,
    resetTodayCarouselUiState,
    setProgressDraft,
    setSelectedBookId,
} from "../dist/renderer/app/today/today_carousel_state.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";
import { todayKey } from "../dist/renderer/sessions/utils.js";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

/**
 * Builds a planner result fixture for Today carousel tests.
 * @param {Array<Record<string, unknown>>} schedule - Schedule rows.
 * @returns {{created_at: string, schedule: Array<Record<string, unknown>>, summary: null}} Planner result fixture.
 */
function plannerResult(schedule) {
    return {
        created_at: CREATED_AT,
        schedule,
        summary: null,
    };
}

/**
 * Builds a Today schedule row fixture.
 * @param {{
 *   bookId: string,
 *   date?: string,
 *   minutes?: number,
 *   sessionIndex: number,
 *   title?: string,
 * }} args - Row input overrides.
 * @returns {Record<string, unknown>} Today row fixture.
 */
function row(args) {
    return {
        book_id: args.bookId,
        date: args.date ?? todayKey(),
        minutes: args.minutes ?? 15,
        session_index: args.sessionIndex,
        title: args.title ?? args.bookId,
        words_planned: 1500,
    };
}

/**
 * Builds a minimal book fixture for Today carousel model tests.
 * @param {string} bookId - Book id.
 * @returns {Record<string, unknown>} Book fixture.
 */
function book(bookId) {
    return {
        author: `${bookId} author`,
        book_id: bookId,
        cover_local_path: "",
        cover_url: "",
        pages_read: 10,
        pages_total: 100,
        progress_percent: 10,
        title: `${bookId} title`,
    };
}

test("buildTodayCarouselModel falls back when pinned row was removed", () => {
    const FIRST = row({ bookId: "book-1", sessionIndex: 1, title: "Book 1" });
    const REMOVED = row({
        bookId: "book-1",
        sessionIndex: 2,
        title: "Book 1",
    });

    const MODEL = buildTodayCarouselModel({
        books: [book("book-1")],
        lastResult: plannerResult([FIRST]),
        pinnedRowKeyByBookId: {
            "book-1": sessionKeyFor(REMOVED),
        },
        scheduleCompletions: {},
        selectedBookId: "book-1",
    });

    assert.equal(MODEL.selectedBookId, "book-1");
    assert.equal(MODEL.active?.row.rowKey, sessionKeyFor(FIRST));
});

test("clearTodayCarouselRowState removes only state for the deleted row", () => {
    resetTodayCarouselUiState();
    const REMOVED_ROW_KEY = "2026-02-24|1|book-1";
    const KEPT_ROW_KEY = "2026-02-24|2|book-2";

    pinRowKey("book-1", REMOVED_ROW_KEY);
    pinRowKey("book-2", KEPT_ROW_KEY);
    setProgressDraft({
        pagesText: "25",
        percentText: "20",
        rowKey: REMOVED_ROW_KEY,
    });
    setProgressDraft({
        pagesText: "50",
        percentText: "40",
        rowKey: KEPT_ROW_KEY,
    });
    setSelectedBookId("book-1");
    closeMinutesEditor();

    openMinutesEditor(REMOVED_ROW_KEY, "15");

    clearTodayCarouselRowState("book-1", REMOVED_ROW_KEY);

    assert.equal(minutesEditor(), null);
    assert.equal(progressDraft(REMOVED_ROW_KEY), null);
    assert.deepEqual(pinnedRowKeySnapshot(), {
        "book-2": KEPT_ROW_KEY,
    });
    assert.deepEqual(progressDraft(KEPT_ROW_KEY), {
        pagesText: "50",
        percentText: "40",
    });
    resetTodayCarouselUiState();
});
