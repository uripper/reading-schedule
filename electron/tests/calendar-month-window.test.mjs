import assert from "node:assert/strict";
import test from "node:test";

import { buildMonthWindow } from "../dist/renderer/calendar/month_window.js";

const MONTH_INDEX_OFFSET = 1;

/**
 * Parses a `YYYY-MM` key into year/month numbers.
 * @param {string} monthKey Month key.
 * @returns {{year: number, month: number}} Parsed parts.
 */
function parseMonth(monthKey) {
    const [yearText, monthText] = monthKey.split("-");
    return {
        month: Number(monthText),
        year: Number(yearText),
    };
}

/**
 * Asserts that month keys are contiguous and sorted.
 * @param {string[]} months Month keys to validate.
 */
function assertContiguous(months) {
    for (let index = 1; index < months.length; index += 1) {
        const previous = parseMonth(months[index - 1]);
        const current = parseMonth(months[index]);
        const previousDate = new Date(
            previous.year,
            previous.month - MONTH_INDEX_OFFSET,
            1,
        );
        previousDate.setMonth(previousDate.getMonth() + MONTH_INDEX_OFFSET);
        const expectedKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + MONTH_INDEX_OFFSET).padStart(2, "0")}`;
        assert.equal(current.year > 0, true);
        assert.equal(months[index], expectedKey);
    }
}

test("buildMonthWindow returns empty array for empty schedule months", () => {
    const out = buildMonthWindow([], new Date(2026, 0, 15));
    assert.deepEqual(out, []);
});

test("buildMonthWindow includes 12-month lookback and schedule future span", () => {
    const out = buildMonthWindow(["2026-06"], new Date(2026, 0, 15));

    assert.equal(out[0], "2025-02");
    assert.equal(out.includes("2026-01"), true);
    assert.equal(out[out.length - 1], "2026-06");
    assertContiguous(out);
});

test("buildMonthWindow includes schedule months older than lookback", () => {
    const out = buildMonthWindow(["2024-10", "2024-12"], new Date(2026, 0, 15));

    assert.equal(out[0], "2024-10");
    assert.equal(out[out.length - 1], "2026-01");
    assertContiguous(out);
});
