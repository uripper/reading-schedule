import assert from "node:assert/strict";
import test from "node:test";

import { dayStyleFlags } from "../dist/renderer/calendar/month_day_button.js";

/**
 * Creates local-midnight date fixture from `YYYY-MM-DD` text.
 * @param {string} dateText - Day key text.
 * @returns {Date} Date fixture.
 */
function day(dateText) {
    return new Date(`${dateText}T00:00:00`);
}

test("dayStyleFlags marks today with selection-friendly flags", () => {
    const FLAGS = dayStyleFlags({
        date: day("2026-02-21"),
        firstDate: day("2026-02-01"),
        keyForDay: "2026-02-21",
        rows: [{ finish: false }],
        selectedDate: "2026-02-21",
        todayKey: "2026-02-21",
    });

    assert.equal(FLAGS.isToday, true);
    assert.equal(FLAGS.isPast, false);
    assert.equal(FLAGS.isSelected, true);
    assert.equal(FLAGS.isMuted, false);
});

test("dayStyleFlags marks non-month cells as muted", () => {
    const FLAGS = dayStyleFlags({
        date: day("2026-01-31"),
        firstDate: day("2026-02-01"),
        keyForDay: "2026-01-31",
        rows: [{ finish: true }],
        selectedDate: "2026-02-02",
        todayKey: "2026-02-21",
    });

    assert.equal(FLAGS.isMuted, true);
    assert.equal(FLAGS.hasFinishRow, true);
});

test("dayStyleFlags keeps today flagged when another day is selected", () => {
    const FLAGS = dayStyleFlags({
        date: day("2026-02-21"),
        firstDate: day("2026-02-01"),
        keyForDay: "2026-02-21",
        rows: [{ finish: false }],
        selectedDate: "2026-02-18",
        todayKey: "2026-02-21",
    });

    assert.equal(FLAGS.isToday, true);
    assert.equal(FLAGS.isSelected, false);
    assert.equal(FLAGS.isPast, false);
});

test("dayStyleFlags ignores completed-only rows in month grid", () => {
    const FLAGS = dayStyleFlags({
        date: day("2026-02-20"),
        firstDate: day("2026-02-01"),
        keyForDay: "2026-02-20",
        rows: [{ completed: true, finish: false }],
        selectedDate: "2026-02-19",
        todayKey: "2026-02-21",
    });

    assert.equal(FLAGS.hasFinishRow, false);
});
