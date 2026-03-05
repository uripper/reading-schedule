import assert from "node:assert/strict";
import test from "node:test";

import {
    buildTodayScheduleSnapshot,
    nextUncompletedPlannedRow,
} from "../dist/renderer/app/today/today_schedule.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";
import { todayKey } from "../dist/renderer/sessions/utils.js";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

/**
 * Builds planner result fixture with provided schedule rows.
 * @param {Array<Record<string, unknown>>} schedule Planner schedule rows.
 * @returns {{schedule: Array<Record<string, unknown>>, summary: null, created_at: string}} Planner result fixture.
 */
function plannerResult(schedule) {
    return {
        created_at: CREATED_AT,
        schedule,
        summary: null,
    };
}

/**
 * Builds schedule row fixture for today-snapshot tests.
 * @param {{
 *   date: string,
 *   sessionIndex: number,
 *   bookId: string,
 *   title: string,
 *   minutes: number,
 * }} args Row input values.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(args) {
    return {
        book_id: args.bookId,
        date: args.date,
        minutes: args.minutes,
        session_index: args.sessionIndex,
        title: args.title,
        words_planned: args.minutes * 100,
    };
}

test("nextUncompletedPlannedRow skips already completed rows", () => {
    const DATE = todayKey();
    const FIRST = row({
        bookId: "book-1",
        date: DATE,
        minutes: 15,
        sessionIndex: 1,
        title: "The First",
    });
    const SECOND = row({
        bookId: "book-2",
        date: DATE,
        minutes: 20,
        sessionIndex: 2,
        title: "Second",
    });
    const COMPLETIONS = {};
    COMPLETIONS[sessionKeyFor(FIRST)] = true;

    const NEXT = nextUncompletedPlannedRow(
        plannerResult([FIRST, SECOND]),
        COMPLETIONS,
    );
    assert.equal(NEXT?.book_id, "book-2");
});

test("buildTodayScheduleSnapshot returns per-book and overall completion counts", () => {
    const DATE = todayKey();
    const FIRST = row({
        bookId: "book-1",
        date: DATE,
        minutes: 10,
        sessionIndex: 1,
        title: "The Book",
    });
    const SECOND = row({
        bookId: "book-1",
        date: DATE,
        minutes: 20,
        sessionIndex: 2,
        title: "The Book",
    });
    const THIRD = row({
        bookId: "book-2",
        date: DATE,
        minutes: 30,
        sessionIndex: 3,
        title: "Another Book",
    });
    const COMPLETIONS = {};
    COMPLETIONS[sessionKeyFor(FIRST)] = true;

    const BOOKS = [
        {
            book_id: "book-1",
            cover_local_path: "",
            cover_url: "https://example.com/one.jpg",
        },
        { book_id: "book-2", cover_local_path: "/tmp/two.jpg", cover_url: "" },
    ];

    const SNAPSHOT = buildTodayScheduleSnapshot(
        plannerResult([FIRST, SECOND, THIRD]),
        COMPLETIONS,
        BOOKS,
    );

    assert.equal(SNAPSHOT.scheduledSessions, 3);
    assert.equal(SNAPSHOT.completedSessions, 1);
    assert.equal(SNAPSHOT.completedPlannedMinutes, 10);
    assert.equal(SNAPSHOT.books.length, 2);
    assert.equal(SNAPSHOT.books[0].title, "Another Book");
    assert.equal(SNAPSHOT.books[1].title, "The Book");
});
