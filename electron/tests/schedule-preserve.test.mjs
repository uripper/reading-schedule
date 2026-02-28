import assert from "node:assert/strict";
import test from "node:test";

import {
	mergeScheduleRows,
	pruneScheduleCompletions,
} from "../dist/renderer/app/schedule_preserve.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";

/**
 * Converts Date fixture to `YYYY-MM-DD` day key.
 * @param {Date} date Date fixture.
 * @returns {string} Day key text.
 */
function dayKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * Offsets a day key by N days.
 * @param {string} key Base day key.
 * @param {number} delta Day offset.
 * @returns {string} Shifted day key.
 */
function plusDays(key, delta) {
	const date = new Date(`${key}T00:00:00`);
	date.setDate(date.getDate() + delta);
	return dayKey(date);
}

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
	return {
		date: "2026-02-20",
		session_index: 1,
		book_id: "book-1",
		title: "Book 1",
		minutes: 10,
		words_planned: 1000,
		...overrides,
	};
}

test("pruneScheduleCompletions keeps day-book fallback keys for rows that still exist", () => {
	const keptRow = row();
	const droppedRow = row({
		date: "2026-02-21",
		session_index: 1,
		book_id: "book-2",
	});
	const completions = {
		[sessionKeyFor(keptRow)]: true,
		[`${keptRow.date}|${keptRow.book_id}`]: true,
		[sessionKeyFor(droppedRow)]: true,
		[`${droppedRow.date}|${droppedRow.book_id}`]: true,
	};
	const pruned = pruneScheduleCompletions(completions, [keptRow]);
	assert.deepEqual(pruned, {
		[sessionKeyFor(keptRow)]: true,
		[`${keptRow.date}|${keptRow.book_id}`]: true,
	});
});

test("pruneScheduleCompletions removes stale day-book keys when matching row no longer exists", () => {
	const keepRow = row();
	const completions = {
		[`${keepRow.date}|${keepRow.book_id}`]: true,
		"2026-02-25|book-missing": true,
	};
	const pruned = pruneScheduleCompletions(completions, [keepRow]);
	assert.deepEqual(pruned, {
		[`${keepRow.date}|${keepRow.book_id}`]: true,
	});
});

test("mergeScheduleRows preserves locked-day rows even when book is no longer in future plan", () => {
	const today = dayKey(new Date());
	const tomorrow = plusDays(today, 1);
	const previousRows = [
		row({ date: today, session_index: 1, book_id: "book-complete" }),
		row({ date: today, session_index: 2, book_id: "book-active" }),
		row({ date: tomorrow, session_index: 1, book_id: "book-complete" }),
		row({ date: tomorrow, session_index: 2, book_id: "book-active" }),
	];
	const nextRows = [
		row({ date: tomorrow, session_index: 1, book_id: "book-active" }),
	];
	const merged = mergeScheduleRows(previousRows, nextRows, []);
	const bookIds = merged.map((entry) => entry.book_id);
	assert.ok(
		bookIds.includes("book-complete"),
		"locked-day rows should be preserved",
	);
	assert.ok(
		bookIds.includes("book-active"),
		"active book rows should be preserved",
	);
});

test("mergeScheduleRows keeps past-day rows for books still in new schedule", () => {
	const today = dayKey(new Date());
	const yesterday = plusDays(today, -1);
	const tomorrow = plusDays(today, 1);
	const previousRows = [
		row({
			date: yesterday,
			session_index: 1,
			book_id: "book-1",
			words_planned: 500,
		}),
		row({
			date: tomorrow,
			session_index: 1,
			book_id: "book-1",
			words_planned: 500,
		}),
	];
	const nextRows = [
		row({
			date: tomorrow,
			session_index: 1,
			book_id: "book-1",
			words_planned: 500,
		}),
	];
	const merged = mergeScheduleRows(previousRows, nextRows, []);
	const yesterdayRows = merged.filter((entry) => entry.date === yesterday);
	assert.equal(yesterdayRows.length, 1);
	assert.equal(yesterdayRows[0].book_id, "book-1");
});

test("mergeScheduleRows preserves today rows while still rebuilding tomorrow onward", () => {
	const today = dayKey(new Date());
	const tomorrow = plusDays(today, 1);
	const previousRows = [
		row({
			date: today,
			session_index: 1,
			book_id: "book-1",
			words_planned: 500,
		}),
		row({
			date: tomorrow,
			session_index: 1,
			book_id: "book-1",
			words_planned: 500,
		}),
	];
	const nextRows = [
		row({
			date: tomorrow,
			session_index: 1,
			book_id: "book-1",
			words_planned: 700,
		}),
	];
	const merged = mergeScheduleRows(previousRows, nextRows, []);
	const todayRows = merged.filter((entry) => entry.date === today);
	const tomorrowRows = merged.filter((entry) => entry.date === tomorrow);
	assert.equal(todayRows.length, 1);
	assert.equal(todayRows[0].words_planned, 500);
	assert.equal(tomorrowRows.length, 1);
	assert.equal(tomorrowRows[0].words_planned, 700);
});

test("mergeScheduleRows excludes day-book pairs that were manually blocked", () => {
	const blockedKey = "2026-02-24|book-1";
	const nextRows = [
		row({ date: "2026-02-24", session_index: 1, book_id: "book-1" }),
		row({ date: "2026-02-24", session_index: 2, book_id: "book-2" }),
	];
	const merged = mergeScheduleRows([], nextRows, [], { [blockedKey]: true });
	assert.equal(merged.length, 1);
	assert.equal(merged[0].book_id, "book-2");
});

test("mergeScheduleRows does not lock malformed day keys from previous rows", () => {
	const previousRows = [
		row({ date: "2026-2-4", session_index: 1, book_id: "book-1" }),
		row({ date: "2026/02/04", session_index: 2, book_id: "book-2" }),
	];
	const merged = mergeScheduleRows(previousRows, [], []);
	assert.equal(merged.length, 0);
});
