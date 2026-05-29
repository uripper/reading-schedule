// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test, { after } from "node:test";

import { installFakeDom } from "./helpers/fake-dom.mjs";

const HARNESS = installFakeDom();
const { attachRangePickerFooter } = await import(
    "../dist/renderer/date-control-range-footer.js"
);

after(() => {
    HARNESS.restore();
});

function pickerStub(calendar, onClose) {
    return {
        calendarContainer: calendar,
        close: onClose,
    };
}

test("attachRangePickerFooter adds one Done button that closes picker", () => {
    const CALENDAR = HARNESS.createElement("div");
    let closeCount = 0;

    attachRangePickerFooter(
        pickerStub(CALENDAR, () => {
            closeCount += 1;
        }),
    );
    attachRangePickerFooter(pickerStub(CALENDAR, () => undefined));

    assert.equal(
        CALENDAR.querySelectorAll(".date-picker-range-footer").length,
        1,
    );
    CALENDAR.querySelector(".date-picker-range-done").click();
    assert.equal(closeCount, 1);
});
