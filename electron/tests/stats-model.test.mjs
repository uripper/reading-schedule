import assert from "node:assert/strict";
import test from "node:test";

import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "../dist/renderer/books/status_catalog.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";
import { todayKey } from "../dist/renderer/sessions/utils.js";
import { buildStatsSnapshot } from "../dist/renderer/stats/model.js";

/**
 * Builds book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture.
 */
function book(overrides) {
    return {
        book_id: "",
        title: "",
        author: "",
        words_total: 1000,
        pages_total: null,
        pages_read: null,
        progress_percent: 0,
        priority: 3,
        difficulty: 3,
        min_blocks_per_session: 1,
        max_minutes_per_day: null,
        deadline: null,
        blocked_by: null,
        shelf: "",
        status: BOOK_STATUS_TO_READ,
        finished_at: null,
        cover_url: "",
        cover_local_path: "",
        lookup_note: "",
        ...overrides,
    };
}

/**
 * Builds schedule row fixture used by stats tests.
 * @param {string} date Day key.
 * @param {number} sessionIndex Session index.
 * @param {string} bookId Book id.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(date, sessionIndex, bookId) {
    return {
        date,
        session_index: sessionIndex,
        book_id: bookId,
        title: bookId,
        minutes: 15,
        words_planned: 1000,
    };
}

test("buildStatsSnapshot combines planned and already-read finishes for current year", () => {
    const year = new Date().getFullYear();
    const janFirst = `${year}-01-01`;
    const janSecond = `${year}-01-02`;
    const febFirst = `${year}-02-01`;
    const previousYearSession = `${year - 1}-12-31T12:00:00.000Z`;

    const rowOne = row(janFirst, 1, "book-1");
    const rowTwo = row(janSecond, 1, "book-2");

    const completions = {};
    completions[sessionKeyFor(rowOne)] = true;

    const snapshot = buildStatsSnapshot({
        books: [
            book({
                book_id: "book-1",
                status: BOOK_STATUS_IN_PROGRESS,
                progress_percent: 30,
            }),
            book({
                book_id: "book-2",
                status: BOOK_STATUS_TO_READ,
                progress_percent: 0,
            }),
            book({
                book_id: "book-3",
                status: BOOK_STATUS_READ,
                progress_percent: 100,
                finished_at: febFirst,
            }),
        ],
        sessions: [
            {
                id: "session-1",
                book_id: "book-1",
                title: "Book 1",
                started_at: `${year}-01-05T12:00:00.000Z`,
                ended_at: `${year}-01-05T12:30:00.000Z`,
                minutes: 30,
                pages_read: null,
                notes: "",
                source: "manual",
                created_at: `${year}-01-05T12:30:00.000Z`,
            },
            {
                id: "session-2",
                book_id: "book-1",
                title: "Book 1",
                started_at: previousYearSession,
                ended_at: previousYearSession,
                minutes: 45,
                pages_read: null,
                notes: "",
                source: "manual",
                created_at: previousYearSession,
            },
        ],
        scheduleCompletions: completions,
        lastResult: {
            schedule: [rowOne, rowTwo],
            created_at: `${year}-01-01T00:00:00.000Z`,
            summary: {
                per_book: {
                    "book-1": { finished: true },
                    "book-2": { finished: false },
                },
            },
        },
    });

    assert.equal(snapshot.plannedFinishCount, 1);
    assert.equal(snapshot.finishedThisYearCount, 1);
    assert.equal(snapshot.projectedFinishCount, 2);
    assert.equal(snapshot.completedSessionsToDate, 1);
    assert.equal(snapshot.scheduledSessionsToDate, 2);
    assert.equal(snapshot.readingMinutesYear, 45);
    assert.equal(snapshot.monthlyFinishes[0], 1);
    assert.equal(snapshot.monthlyFinishes[1], 1);
});

test("buildStatsSnapshot uses completed schedule rows for reading minutes and streak", () => {
    const year = new Date().getFullYear();
    const today = todayKey();
    const scheduleRow = row(today, 1, "book-1");
    scheduleRow.minutes = 40;
    const completions = {};
    completions[sessionKeyFor(scheduleRow)] = true;

    const snapshot = buildStatsSnapshot({
        books: [
            book({
                book_id: "book-1",
                status: BOOK_STATUS_IN_PROGRESS,
                progress_percent: 10,
            }),
        ],
        sessions: [],
        scheduleCompletions: completions,
        dailyGoalMinutes: 30,
        lastResult: {
            schedule: [scheduleRow],
            created_at: `${year}-01-01T00:00:00.000Z`,
            summary: {
                per_book: {
                    "book-1": { finished: false },
                },
            },
        },
    });

    assert.equal(snapshot.readingMinutesYear, 40);
    assert.equal(snapshot.activeDaysYear, 1);
    assert.equal(snapshot.currentStreakDays, 1);
});
