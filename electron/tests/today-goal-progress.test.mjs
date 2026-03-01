import assert from "node:assert/strict";
import test from "node:test";

import { goalProgressPercent } from "../dist/renderer/app/today.js";

test("goalProgressPercent computes expected percentage for partial progress", () => {
    assert.equal(goalProgressPercent(15, 30), 50);
});

test("goalProgressPercent clamps completed progress at 100", () => {
    assert.equal(goalProgressPercent(65, 30), 100);
});

test("goalProgressPercent guards against zero or negative goal minutes", () => {
    assert.equal(goalProgressPercent(10, 0), 100);
    assert.equal(goalProgressPercent(0, -50), 0);
});
