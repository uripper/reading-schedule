// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    dayKeyFromDate,
    localDayKeyFromIso,
    todayDayKey,
} from "../dist/renderer/app/date_keys.js";

test("day key helpers format local calendar keys consistently", () => {
    assert.equal(dayKeyFromDate(new Date(2026, 0, 5)), "2026-01-05");
    assert.equal(localDayKeyFromIso("2026-01-05T12:30:00.000Z"), "2026-01-05");
    assert.match(todayDayKey(), /^\d{4}-\d{2}-\d{2}$/u);
});

test("localDayKeyFromIso returns an empty string for invalid input", () => {
    assert.equal(localDayKeyFromIso("not-a-date"), "");
});
