import assert from "node:assert/strict";
import test from "node:test";

import { holoVarsForPointer } from "../dist/renderer/books/card_holo.js";

test("holoVarsForPointer computes centered percentages", () => {
    const vars = holoVarsForPointer(
        { left: 10, top: 20, width: 200, height: 100 },
        110,
        70,
    );
    assert.equal(vars.pointerX, "50%");
    assert.equal(vars.pointerY, "50%");
    assert.equal(vars.bgShiftX, "50%");
    assert.equal(vars.bgShiftY, "50%");
});

test("holoVarsForPointer clamps out-of-bounds pointer coordinates", () => {
    const vars = holoVarsForPointer(
        { left: 100, top: 100, width: 200, height: 100 },
        -999,
        999,
    );
    assert.equal(vars.pointerX, "0%");
    assert.equal(vars.pointerY, "100%");
    assert.equal(vars.bgShiftX, "32.5%");
    assert.equal(vars.bgShiftY, "67.5%");
});
