// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Verifies dropdown keyboard selection and Escape containment. */
import assert from "node:assert/strict";
import test from "node:test";
import { bindKoboSearchKeys } from "../dist/renderer/kobo/search-keys.js";

function fixture() {
    const INPUT = new EventTarget();
    const STATE = { moves: [], open: false, picked: 0 };
    bindKoboSearchKeys(INPUT, {
        close: () => {
            STATE.open = false;
        },
        isOpen: () => STATE.open,
        move: (step) => {
            STATE.moves.push(step);
        },
        open: () => {
            STATE.open = true;
        },
        pick: () => {
            STATE.picked += 1;
        },
    });
    return { input: INPUT, state: STATE };
}

function key(input, value) {
    const EVENT = new Event("keydown", { cancelable: true });
    EVENT.key = value;
    input.dispatchEvent(EVENT);
    return EVENT;
}

test("arrows open and navigate results while Enter selects the active match", () => {
    const { input: INPUT, state: STATE } = fixture();
    assert.equal(key(INPUT, "ArrowDown").defaultPrevented, true);
    assert.equal(STATE.open, true);
    key(INPUT, "ArrowDown");
    key(INPUT, "ArrowUp");
    assert.deepEqual(STATE.moves, [1, -1]);
    key(INPUT, "Enter");
    assert.equal(STATE.picked, 1);
});

test("Escape closes an open dropdown before the parent dialog", () => {
    const { input: INPUT, state: STATE } = fixture();
    STATE.open = true;
    assert.equal(key(INPUT, "Escape").defaultPrevented, true);
    assert.equal(STATE.open, false);
    assert.equal(key(INPUT, "Escape").defaultPrevented, false);
});
