// biome-ignore-all lint/correctness/noUnresolvedImports: tests use the built shared frontend.
/** Verifies same-day replanning explains empty days without losing warnings. */

import assert from "node:assert/strict";
import test from "node:test";
import { nextDayKey, todayDayKey } from "../dist/renderer/app/date_keys.js";
import { applyPlanResultStatus } from "../dist/renderer/app/plan-status.js";

const TODAY = todayDayKey();
const TOMORROW = nextDayKey(TODAY);
const TODAY_SUCCESS = "Today Replanned";

/** Captures the user-visible message for a generated schedule. */
function statusFor(schedule, summary, message = TODAY_SUCCESS) {
    const STATUSES = [];
    applyPlanResultStatus({
        data: { schedule, summary },
        setStatus: (...args) => {
            STATUSES.push(args);
        },
        statusSuccessMessage: message,
    });
    return STATUSES;
}

/** Supplies a generated reading session on a selected day. */
function row(date) {
    return {
        book_id: "book-1",
        date,
        minutes: 30,
        session_index: 1,
        title: "Book 1",
        words_planned: 7500,
    };
}

test("an empty Today replan explains capacity and book constraints", () => {
    const [[MESSAGE, IS_ERROR]] = statusFor([row(TOMORROW)], {
        status: "FEASIBLE",
    });
    assert.match(MESSAGE, /No new sessions fit today's budget/u);
    assert.match(MESSAGE, /reading days, dependencies, and available minutes/u);
    assert.equal(IS_ERROR, false);
});

test("a successful Today replacement keeps the normal success status", () => {
    assert.deepEqual(statusFor([row(TODAY)], { status: "FEASIBLE" }), [
        [TODAY_SUCCESS, false, "success"],
    ]);
});

test("an incomplete plan keeps its actionable warning", () => {
    assert.deepEqual(
        statusFor([], {
            feasibility_warning: "Increase the reading budget.",
            status: "INCOMPLETE",
        }),
        [["Increase the reading budget.", true, "error"]],
    );
});

test("automatic future planning keeps its own status message", () => {
    assert.deepEqual(statusFor([], null, "Schedule Updated"), [
        ["Schedule Updated", false, "success"],
    ]);
});
