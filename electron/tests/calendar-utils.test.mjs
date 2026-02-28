import assert from "node:assert/strict";
import test from "node:test";

import {
    dateHeading,
    dayKey,
    monthCells,
} from "../dist/renderer/calendar/utils.js";

/**
 * Returns heading formatter matching calendar details heading options.
 * @returns {Intl.DateTimeFormat} Formatter for day-detail heading text.
 */
function headingFormatter() {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

test("monthCells starts a Sunday-first month on that Sunday", () => {
    const cells = monthCells("2026-02");
    assert.equal(dayKey(cells[0]), "2026-02-01");
});

test("monthCells includes prior Sunday when month starts on Monday", () => {
    const cells = monthCells("2026-06");
    assert.equal(dayKey(cells[0]), "2026-05-31");
});

test("dateHeading formats day keys using local calendar date", () => {
    const localDate = new Date(2026, 1, 23);
    const expected = headingFormatter().format(localDate);
    assert.equal(dateHeading("2026-02-23"), expected);
});
