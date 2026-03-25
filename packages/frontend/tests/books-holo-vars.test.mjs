// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { holoVarsForPointer } from "../dist/renderer/books/card_holo.js";

test("holoVarsForPointer computes centered percentages", () => {
    const VARS = holoVarsForPointer(
        { height: 100, left: 10, top: 20, width: 200 },
        110,
        70,
    );
    assert.equal(VARS.pointerX, "50%");
    assert.equal(VARS.pointerY, "50%");
    assert.equal(VARS.bgShiftX, "50%");
    assert.equal(VARS.bgShiftY, "50%");
});

test("holoVarsForPointer clamps out-of-bounds pointer coordinates", () => {
    const VARS = holoVarsForPointer(
        { height: 100, left: 100, top: 100, width: 200 },
        -999,
        999,
    );
    assert.equal(VARS.pointerX, "0%");
    assert.equal(VARS.pointerY, "100%");
    assert.equal(VARS.bgShiftX, "32.5%");
    assert.equal(VARS.bgShiftY, "67.5%");
});
