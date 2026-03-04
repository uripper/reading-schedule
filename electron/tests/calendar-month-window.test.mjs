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
    const [YEAR_TEXT, MONTH_TEXT] = monthKey.split("-");
    return {
        month: Number(MONTH_TEXT),
        year: Number(YEAR_TEXT),
    };
}

/**
 * Asserts that month keys are contiguous and sorted.
 * @param {string[]} months Month keys to validate.
 */
function assertContiguous(months) {
    for (let index = 1; index < months.length; index += 1) {
        const PREVIOUS = parseMonth(months[index - 1]);
        const CURRENT = parseMonth(months[index]);
        const PREVIOUS_DATE = new Date(
            PREVIOUS.year,
            PREVIOUS.month - MONTH_INDEX_OFFSET,
            1,
        );
        PREVIOUS_DATE.setMonth(PREVIOUS_DATE.getMonth() + MONTH_INDEX_OFFSET);
        const EXPECTED_KEY = `${PREVIOUS_DATE.getFullYear()}-${String(PREVIOUS_DATE.getMonth() + MONTH_INDEX_OFFSET).padStart(2, "0")}`;
        assert.equal(CURRENT.year > 0, true);
        assert.equal(months[index], EXPECTED_KEY);
    }
}

test("buildMonthWindow returns empty array for empty schedule months", () => {
    const OUT = buildMonthWindow([], new Date(2026, 0, 15));
    assert.deepEqual(OUT, []);
});

test("buildMonthWindow includes 12-month lookback and schedule future span", () => {
    const OUT = buildMonthWindow(["2026-06"], new Date(2026, 0, 15));

    assert.equal(OUT[0], "2025-02");
    assert.equal(OUT.includes("2026-01"), true);
    assert.equal(OUT[OUT.length - 1], "2026-06");
    assertContiguous(OUT);
});

test("buildMonthWindow includes schedule months older than lookback", () => {
    const OUT = buildMonthWindow(["2024-10", "2024-12"], new Date(2026, 0, 15));

    assert.equal(OUT[0], "2024-10");
    assert.equal(OUT[OUT.length - 1], "2026-01");
    assertContiguous(OUT);
});
