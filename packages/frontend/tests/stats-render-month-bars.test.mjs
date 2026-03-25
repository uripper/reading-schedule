// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    barHeightPercent,
    finishCountLabel,
} from "../dist/renderer/stats/render.js";

test("finishCountLabel uses singular and plural wording", () => {
    assert.equal(finishCountLabel(1), "1 finish");
    assert.equal(finishCountLabel(2), "2 finishes");
});

test("barHeightPercent enforces minimum non-zero bar height", () => {
    assert.equal(barHeightPercent(0, 5), 0);
    assert.equal(barHeightPercent(1, 100), 8);
    assert.equal(barHeightPercent(40, 100), 40);
});
