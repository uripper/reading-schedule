// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { chipClassNameForRow } from "../dist/renderer/calendar/month_day_button_chips.js";

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
