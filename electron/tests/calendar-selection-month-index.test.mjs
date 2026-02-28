import assert from "node:assert/strict";
import test from "node:test";

import { indexForMonth } from "../dist/renderer/calendar/selection.js";

test("indexForMonth returns exact match index", () => {
	const months = ["2025-10", "2025-11", "2025-12"];
	const index = indexForMonth(months, "2025-11");
	assert.equal(index, 1);
});

test("indexForMonth returns first index when target is before range", () => {
	const months = ["2025-10", "2025-11", "2025-12"];
	const index = indexForMonth(months, "2025-09");
	assert.equal(index, 0);
});

test("indexForMonth returns first upcoming month for in-between targets", () => {
	const months = ["2025-10", "2025-12", "2026-01"];
	const index = indexForMonth(months, "2025-11");
	assert.equal(index, 1);
});

test("indexForMonth returns last index when target is after range", () => {
	const months = ["2025-10", "2025-11", "2025-12"];
	const index = indexForMonth(months, "2026-01");
	assert.equal(index, 2);
});
