// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { indexForMonth } from "../dist/renderer/calendar/selection.js";

test("indexForMonth returns exact match index", () => {
    const MONTHS = ["2025-10", "2025-11", "2025-12"];
    const INDEX = indexForMonth(MONTHS, "2025-11");
    assert.equal(INDEX, 1);
});

test("indexForMonth returns first index when target is before range", () => {
    const MONTHS = ["2025-10", "2025-11", "2025-12"];
    const INDEX = indexForMonth(MONTHS, "2025-09");
    assert.equal(INDEX, 0);
});

test("indexForMonth returns first upcoming month for in-between targets", () => {
    const MONTHS = ["2025-10", "2025-12", "2026-01"];
    const INDEX = indexForMonth(MONTHS, "2025-11");
    assert.equal(INDEX, 1);
});

test("indexForMonth returns last index when target is after range", () => {
    const MONTHS = ["2025-10", "2025-11", "2025-12"];
    const INDEX = indexForMonth(MONTHS, "2026-01");
    assert.equal(INDEX, 2);
});
