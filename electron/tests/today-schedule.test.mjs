import assert from "node:assert/strict";
import test from "node:test";

import {
    buildTodayScheduleSnapshot,
    nextUncompletedPlannedRow,
} from "../dist/renderer/app/today_schedule.js";
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
    const date = todayKey();
    const first = row({
        bookId: "book-1",
        date,
        minutes: 15,
        sessionIndex: 1,
        title: "The First",
    });
    const second = row({
        bookId: "book-2",
        date,
        minutes: 20,
        sessionIndex: 2,
        title: "Second",
    });
    const completions = {};
    completions[sessionKeyFor(first)] = true;

    const next = nextUncompletedPlannedRow(
        plannerResult([first, second]),
        completions,
    );
    assert.equal(next?.book_id, "book-2");
});

test("buildTodayScheduleSnapshot returns per-book and overall completion counts", () => {
    const date = todayKey();
    const first = row({
        bookId: "book-1",
        date,
        minutes: 10,
        sessionIndex: 1,
        title: "The Book",
    });
    const second = row({
        bookId: "book-1",
        date,
        minutes: 20,
        sessionIndex: 2,
        title: "The Book",
    });
    const third = row({
        bookId: "book-2",
        date,
        minutes: 30,
        sessionIndex: 3,
        title: "Another Book",
    });
    const completions = {};
    completions[sessionKeyFor(first)] = true;

    const books = [
        {
            book_id: "book-1",
            cover_local_path: "",
            cover_url: "https://example.com/one.jpg",
        },
        { book_id: "book-2", cover_local_path: "/tmp/two.jpg", cover_url: "" },
    ];

    const snapshot = buildTodayScheduleSnapshot(
        plannerResult([first, second, third]),
        completions,
        books,
    );

    assert.equal(snapshot.scheduledSessions, 3);
    assert.equal(snapshot.completedSessions, 1);
    assert.equal(snapshot.completedPlannedMinutes, 10);
    assert.equal(snapshot.books.length, 2);
    assert.equal(snapshot.books[0].title, "Another Book");
    assert.equal(snapshot.books[1].title, "The Book");
});
