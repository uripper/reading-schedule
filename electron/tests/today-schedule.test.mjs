import test from "node:test";
import assert from "node:assert/strict";

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
    schedule,
    summary: null,
    created_at: CREATED_AT,
  };
}

/**
 * Builds schedule row fixture for today-snapshot tests.
 * @param {string} date Day key.
 * @param {number} sessionIndex Session index.
 * @param {string} bookId Book id.
 * @param {string} title Session title.
 * @param {number} minutes Planned minutes.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(date, sessionIndex, bookId, title, minutes) {
  return {
    date,
    session_index: sessionIndex,
    book_id: bookId,
    title,
    minutes,
    words_planned: minutes * 100,
  };
}

test("nextUncompletedPlannedRow skips already completed rows", () => {
  const date = todayKey();
  const first = row(date, 1, "book-1", "The First", 15);
  const second = row(date, 2, "book-2", "Second", 20);
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
  const first = row(date, 1, "book-1", "The Book", 10);
  const second = row(date, 2, "book-1", "The Book", 20);
  const third = row(date, 3, "book-2", "Another Book", 30);
  const completions = {};
  completions[sessionKeyFor(first)] = true;

  const books = [
    {
      book_id: "book-1",
      cover_url: "https://example.com/one.jpg",
      cover_local_path: "",
    },
    { book_id: "book-2", cover_url: "", cover_local_path: "/tmp/two.jpg" },
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
