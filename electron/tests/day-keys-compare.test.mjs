import assert from "node:assert/strict";
import test from "node:test";

import {
    compareDayKeys,
    isOnOrAfterDay,
    isOnOrBeforeDay,
    isValidDayKey,
} from "../dist/renderer/app/day_keys_compare.js";

test("isValidDayKey accepts strict calendar YYYY-MM-DD keys", () => {
    assert.equal(isValidDayKey("2026-02-27"), true);
    assert.equal(isValidDayKey("2026-02-30"), false);
    assert.equal(isValidDayKey("2026-2-27"), false);
    assert.equal(isValidDayKey("not-a-date"), false);
});

test("compareDayKeys returns null when either key is invalid", () => {
    assert.equal(compareDayKeys("2026-02-27", "bad-key"), null);
    assert.equal(compareDayKeys("bad-key", "2026-02-27"), null);
});

test("day key ordering helpers compare valid keys consistently", () => {
    assert.equal(compareDayKeys("2026-02-27", "2026-02-27"), 0);
    assert.equal(compareDayKeys("2026-02-26", "2026-02-27"), -1);
    assert.equal(compareDayKeys("2026-02-28", "2026-02-27"), 1);

    assert.equal(isOnOrBeforeDay("2026-02-27", "2026-02-27"), true);
    assert.equal(isOnOrBeforeDay("2026-02-26", "2026-02-27"), true);
    assert.equal(isOnOrBeforeDay("2026-02-28", "2026-02-27"), false);

    assert.equal(isOnOrAfterDay("2026-02-27", "2026-02-27"), true);
    assert.equal(isOnOrAfterDay("2026-02-28", "2026-02-27"), true);
    assert.equal(isOnOrAfterDay("2026-02-26", "2026-02-27"), false);
});
