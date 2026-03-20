// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
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
const BASE_BOOK = {
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
};

/**
 * Builds book fixture with override support.
 * @param overrides - Book field overrides.
 * @returns Book fixture.
 */
const BOOK = (overrides) => {
    return { ...BASE_BOOK, ...overrides };
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

function completionMapFor(...rows) {
    const COMPLETIONS = {};

    for (const ENTRY of rows) {
        COMPLETIONS[sessionKeyFor(ENTRY)] = true;
    }
    return COMPLETIONS;
}

function manualSession(timestamp, minutes) {
    return {
        book_id: "book-1",
        created_at: timestamp,
        ended_at: timestamp,
        id: `session-${minutes}`,
        minutes,
        notes: "",
        pages_read: null,
        source: "manual",
        started_at: timestamp,
        title: "Book 1",
    };
}

function lastResultFor(year, rows, perBook) {
    return {
        created_at: `${year}-01-01T00:00:00.000Z`,
        schedule: rows,
        summary: {
            per_book: perBook,
        },
    };
}

function yearlyBooks(febFirst) {
    return [
        BOOK({
            book_id: "book-1",
            progress_percent: 30,
            status: BOOK_STATUS_IN_PROGRESS,
        }),
        BOOK({ book_id: "book-2" }),
        BOOK({
            book_id: "book-3",
            finished_at: febFirst,
            progress_percent: 100,
            status: BOOK_STATUS_READ,
        }),
    ];
}

function yearlySnapshotFixture() {
    const YEAR = new Date().getFullYear();
    const ROW_ONE = ROW(`${YEAR}-01-01`, 1, "book-1");
    const ROW_TWO = ROW(`${YEAR}-01-02`, 1, "book-2");
    const FEB_FIRST = `${YEAR}-02-01`;
    const PREVIOUS_YEAR_SESSION = `${YEAR - 1}-12-31T12:00:00.000Z`;
    return buildStatsSnapshot({
        books: yearlyBooks(FEB_FIRST),
        lastResult: lastResultFor(YEAR, [ROW_ONE, ROW_TWO], {
            "book-1": { finished: true },
            "book-2": { finished: false },
        }),
        scheduleCompletions: completionMapFor(ROW_ONE),
        sessions: [
            manualSession(`${YEAR}-01-05T12:30:00.000Z`, 30),
            manualSession(PREVIOUS_YEAR_SESSION, 45),
        ],
    });
}

function scheduleOnlySnapshot() {
    const YEAR = new Date().getFullYear();
    const SCHEDULE_ROW = ROW(todayKey(), 1, "book-1");
    SCHEDULE_ROW.minutes = 40;
    return buildStatsSnapshot({
        books: [
            BOOK({
                book_id: "book-1",
                progress_percent: 10,
                status: BOOK_STATUS_IN_PROGRESS,
            }),
        ],
        dailyGoalMinutes: 30,
        lastResult: lastResultFor(YEAR, [SCHEDULE_ROW], {
            "book-1": { finished: false },
        }),
        scheduleCompletions: completionMapFor(SCHEDULE_ROW),
        sessions: [],
    });
}

test("buildStatsSnapshot combines planned and already-read finishes for current year", () => {
    const SNAPSHOT = yearlySnapshotFixture();

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
    const SNAPSHOT = scheduleOnlySnapshot();

    assert.equal(
        SNAPSHOT.readingMinutesYear,
        EXPECTED_READING_MINUTES_WITH_ONLY_SCHEDULED,
    );
    assert.equal(SNAPSHOT.activeDaysYear, 1);
    assert.equal(SNAPSHOT.currentStreakDays, 1);
});
