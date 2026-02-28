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

const EXPECTED_READING_MINUTES_WITH_PLANNED_AND_FINISHED = 45;
const EXPECTED_READING_MINUTES_WITH_ONLY_SCHEDULED = 40;

/**
 * Builds book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture.
 */
const book = (overrides) => {
    return {
        author: "",
        blocked_by: null,
        book_id: "",
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
        shelf: "",
        status: BOOK_STATUS_TO_READ,
        title: "",
        words_total: 1000,
        ...overrides,
    };
};

/**
 * Builds schedule row fixture used by stats tests.
 * @param {string} date Day key.
 * @param {number} sessionIndex Session index.
 * @param {string} bookId Book id.
 * @returns {Record<string, unknown>} Row fixture.
 */
const row = (date, sessionIndex, bookId) => {
    return {
        book_id: bookId,
        date,
        minutes: 15,
        session_index: sessionIndex,
        title: bookId,
        words_planned: 1000,
    };
};

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
                progress_percent: 30,
                status: BOOK_STATUS_IN_PROGRESS,
            }),
            book({
                book_id: "book-2",
                progress_percent: 0,
                status: BOOK_STATUS_TO_READ,
            }),
            book({
                book_id: "book-3",
                finished_at: febFirst,
                progress_percent: 100,
                status: BOOK_STATUS_READ,
            }),
        ],
        lastResult: {
            created_at: `${year}-01-01T00:00:00.000Z`,
            schedule: [rowOne, rowTwo],
            summary: {
                per_book: {
                    "book-1": { finished: true },
                    "book-2": { finished: false },
                },
            },
        },
        scheduleCompletions: completions,
        sessions: [
            {
                book_id: "book-1",
                created_at: `${year}-01-05T12:30:00.000Z`,
                ended_at: `${year}-01-05T12:30:00.000Z`,
                id: "session-1",
                minutes: 30,
                notes: "",
                pages_read: null,
                source: "manual",
                started_at: `${year}-01-05T12:00:00.000Z`,
                title: "Book 1",
            },
            {
                book_id: "book-1",
                created_at: previousYearSession,
                ended_at: previousYearSession,
                id: "session-2",
                minutes: 45,
                notes: "",
                pages_read: null,
                source: "manual",
                started_at: previousYearSession,
                title: "Book 1",
            },
        ],
    });

    assert.equal(snapshot.plannedFinishCount, 1);
    assert.equal(snapshot.finishedThisYearCount, 1);
    assert.equal(snapshot.projectedFinishCount, 2);
    assert.equal(snapshot.completedSessionsToDate, 1);
    assert.equal(snapshot.scheduledSessionsToDate, 2);
    assert.equal(
        snapshot.readingMinutesYear,
        EXPECTED_READING_MINUTES_WITH_PLANNED_AND_FINISHED,
    );
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
                progress_percent: 10,
                status: BOOK_STATUS_IN_PROGRESS,
            }),
        ],
        dailyGoalMinutes: 30,
        lastResult: {
            created_at: `${year}-01-01T00:00:00.000Z`,
            schedule: [scheduleRow],
            summary: {
                per_book: {
                    "book-1": { finished: false },
                },
            },
        },
        scheduleCompletions: completions,
        sessions: [],
    });

    assert.equal(
        snapshot.readingMinutesYear,
        EXPECTED_READING_MINUTES_WITH_ONLY_SCHEDULED,
    );
    assert.equal(snapshot.activeDaysYear, 1);
    assert.equal(snapshot.currentStreakDays, 1);
});
