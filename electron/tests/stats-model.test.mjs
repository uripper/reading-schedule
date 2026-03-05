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
 * @param overrides - Book field overrides.
 * @returns Book fixture.
 */
const BOOK = (overrides) => {
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
 * @param date - Day key.
 * @param sessionIndex - Session index.
 * @param bookId - Book id.
 * @returns Row fixture.
 */
const ROW = (date, sessionIndex, bookId) => {
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
    const YEAR = new Date().getFullYear();
    const JAN_FIRST = `${YEAR}-01-01`;
    const JAN_SECOND = `${YEAR}-01-02`;
    const FEB_FIRST = `${YEAR}-02-01`;
    const PREVIOUS_YEAR_SESSION = `${YEAR - 1}-12-31T12:00:00.000Z`;

    const ROW_ONE = ROW(JAN_FIRST, 1, "book-1");
    const ROW_TWO = ROW(JAN_SECOND, 1, "book-2");

    const COMPLETIONS = {};
    COMPLETIONS[sessionKeyFor(ROW_ONE)] = true;

    const SNAPSHOT = buildStatsSnapshot({
        books: [
            BOOK({
                book_id: "book-1",
                progress_percent: 30,
                status: BOOK_STATUS_IN_PROGRESS,
            }),
            BOOK({
                book_id: "book-2",
                progress_percent: 0,
                status: BOOK_STATUS_TO_READ,
            }),
            BOOK({
                book_id: "book-3",
                finished_at: FEB_FIRST,
                progress_percent: 100,
                status: BOOK_STATUS_READ,
            }),
        ],
        lastResult: {
            created_at: `${YEAR}-01-01T00:00:00.000Z`,
            schedule: [ROW_ONE, ROW_TWO],
            summary: {
                per_book: {
                    "book-1": { finished: true },
                    "book-2": { finished: false },
                },
            },
        },
        scheduleCompletions: COMPLETIONS,
        sessions: [
            {
                book_id: "book-1",
                created_at: `${YEAR}-01-05T12:30:00.000Z`,
                ended_at: `${YEAR}-01-05T12:30:00.000Z`,
                id: "session-1",
                minutes: 30,
                notes: "",
                pages_read: null,
                source: "manual",
                started_at: `${YEAR}-01-05T12:00:00.000Z`,
                title: "Book 1",
            },
            {
                book_id: "book-1",
                created_at: PREVIOUS_YEAR_SESSION,
                ended_at: PREVIOUS_YEAR_SESSION,
                id: "session-2",
                minutes: 45,
                notes: "",
                pages_read: null,
                source: "manual",
                started_at: PREVIOUS_YEAR_SESSION,
                title: "Book 1",
            },
        ],
    });

    assert.equal(SNAPSHOT.plannedFinishCount, 1);
    assert.equal(SNAPSHOT.finishedThisYearCount, 1);
    assert.equal(SNAPSHOT.projectedFinishCount, 2);
    assert.equal(SNAPSHOT.completedSessionsToDate, 1);
    assert.equal(SNAPSHOT.scheduledSessionsToDate, 2);
    assert.equal(
        SNAPSHOT.readingMinutesYear,
        EXPECTED_READING_MINUTES_WITH_PLANNED_AND_FINISHED,
    );
    assert.equal(SNAPSHOT.monthlyFinishes[0], 1);
    assert.equal(SNAPSHOT.monthlyFinishes[1], 1);
});

test("buildStatsSnapshot uses completed schedule rows for reading minutes and streak", () => {
    const YEAR = new Date().getFullYear();
    const TODAY = todayKey();
    const SCHEDULE_ROW = ROW(TODAY, 1, "book-1");
    SCHEDULE_ROW.minutes = 40;
    const COMPLETIONS = {};
    COMPLETIONS[sessionKeyFor(SCHEDULE_ROW)] = true;

    const SNAPSHOT = buildStatsSnapshot({
        books: [
            BOOK({
                book_id: "book-1",
                progress_percent: 10,
                status: BOOK_STATUS_IN_PROGRESS,
            }),
        ],
        dailyGoalMinutes: 30,
        lastResult: {
            created_at: `${YEAR}-01-01T00:00:00.000Z`,
            schedule: [SCHEDULE_ROW],
            summary: {
                per_book: {
                    "book-1": { finished: false },
                },
            },
        },
        scheduleCompletions: COMPLETIONS,
        sessions: [],
    });

    assert.equal(
        SNAPSHOT.readingMinutesYear,
        EXPECTED_READING_MINUTES_WITH_ONLY_SCHEDULED,
    );
    assert.equal(SNAPSHOT.activeDaysYear, 1);
    assert.equal(SNAPSHOT.currentStreakDays, 1);
});
