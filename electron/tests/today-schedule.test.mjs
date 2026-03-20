// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
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
 * @param schedule - Planner schedule rows.
 * @returns Planner result fixture.
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
 * @param args - Row input values.
 *   date: string,
 *   sessionIndex: number,
 *   title: string,
 *   bookId: string,
 *   minutes: number,
 * @returns  Row fixture.
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

function todayRows() {
    const DATE = todayKey();
    return {
        first: row({
            bookId: "book-1",
            date: DATE,
            minutes: 10,
            sessionIndex: 1,
            title: "The Book",
        }),
        second: row({
            bookId: "book-1",
            date: DATE,
            minutes: 20,
            sessionIndex: 2,
            title: "The Book",
        }),
        third: row({
            bookId: "book-2",
            date: DATE,
            minutes: 30,
            sessionIndex: 3,
            title: "Another Book",
        }),
    };
}

function snapshotBooks() {
    return [
        {
            book_id: "book-1",
            cover_local_path: "",
            cover_url: "https://example.com/one.jpg",
        },
        { book_id: "book-2", cover_local_path: "/tmp/two.jpg", cover_url: "" },
    ];
}

function assertSnapshotTotals(snapshot) {
    assert.equal(snapshot.scheduledSessions, 3);
    assert.equal(snapshot.completedSessions, 1);
    assert.equal(snapshot.completedPlannedMinutes, 10);
    assert.equal(snapshot.books.length, 2);
}

function assertSnapshotBookOrder(snapshot) {
    assert.equal(snapshot.books[0].title, "Another Book");
    assert.equal(snapshot.books[1].title, "The Book");
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
    const ROWS = todayRows();
    const COMPLETIONS = {};
    COMPLETIONS[sessionKeyFor(ROWS.first)] = true;

    const SNAPSHOT = buildTodayScheduleSnapshot(
        plannerResult([ROWS.first, ROWS.second, ROWS.third]),
        COMPLETIONS,
        snapshotBooks(),
    );

    assertSnapshotTotals(SNAPSHOT);
    assertSnapshotBookOrder(SNAPSHOT);
});
