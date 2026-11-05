import assert from "node:assert/strict";
import test from "node:test";

import {
    appendDayButtonSummary,
    chipClassNameForRow,
} from "../dist/renderer/calendar/month_day_button_chips.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

test("chipClassNameForRow does not style completed rows in month grid", () => {
    const CLASS_NAME = chipClassNameForRow({
        completed: true,
        finish: false,
    });

    assert.equal(CLASS_NAME, "day-chip");
});

test("chipClassNameForRow applies finish style for expected finish rows", () => {
    const CLASS_NAME = chipClassNameForRow({
        completed: false,
        finish: true,
    });

    assert.equal(CLASS_NAME, "day-chip finish");
});

test("chipClassNameForRow keeps base style for normal rows", () => {
    const CLASS_NAME = chipClassNameForRow({
        completed: false,
        finish: false,
    });

    assert.equal(CLASS_NAME, "day-chip");
});

test("calendar chips show titles without session minutes", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const DAY = DOM.createElement("button");
    appendDayButtonSummary(DAY, [
        { title: "Practical SQL", minutes: 60, finish: true },
        { title: "Metaphysics", minutes: 30 },
        { title: "Earthsea", minutes: 15 },
    ]);
    const CHIPS = DAY.querySelectorAll(".day-chip");
    assert.deepEqual(
        CHIPS.map((chip) => chip.textContent),
        ["Practical SQL", "Metaphysics", "+1 more"],
    );
    assert.ok(CHIPS[0].classList.contains("finish"));
});
