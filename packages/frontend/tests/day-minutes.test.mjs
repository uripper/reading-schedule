// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import { streakFromDayMinutes } from "../dist/renderer/activity/day-minutes.js";
import { dayKeyFromDate } from "../dist/renderer/app/date_keys.js";

const DAILY_GOAL_MINUTES = 30;
const INCOMPLETE_TODAY_MINUTES = 10;
const PREVIOUS_DAY_OFFSET = 1;

function relativeDayKey(daysAgo) {
    const DATE = new Date();
    DATE.setDate(DATE.getDate() - daysAgo);
    return dayKeyFromDate(DATE);
}

test("streakFromDayMinutes preserves yesterday streak before today is complete", () => {
    const DAY_MINUTES = new Map([
        [relativeDayKey(0), INCOMPLETE_TODAY_MINUTES],
        [relativeDayKey(PREVIOUS_DAY_OFFSET), DAILY_GOAL_MINUTES],
    ]);

    assert.equal(streakFromDayMinutes(DAY_MINUTES, DAILY_GOAL_MINUTES), 1);
});

test("streakFromDayMinutes includes today after goal completion", () => {
    const DAY_MINUTES = new Map([
        [relativeDayKey(0), DAILY_GOAL_MINUTES],
        [relativeDayKey(PREVIOUS_DAY_OFFSET), DAILY_GOAL_MINUTES],
    ]);

    assert.equal(streakFromDayMinutes(DAY_MINUTES, DAILY_GOAL_MINUTES), 2);
});
