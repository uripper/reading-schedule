// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test, { after } from "node:test";

import { installFakeDom } from "./helpers/fake-dom.mjs";

const HARNESS = installFakeDom();
const { bindDayOffAddButton, renderDayOffs } = await import(
    "../dist/renderer/settings/day_offs.js"
);
const { dayOffDatesFromInput } = await import(
    "../dist/renderer/settings/day-off-dates.js"
);
const { parseSettings } = await import("@reading-schedule/contracts");

after(() => {
    HARNESS.restore();
});

function appendNode(tagName, id) {
    const NODE = HARNESS.createElement(tagName, id);
    HARNESS.document.body.append(NODE);
    return NODE;
}

function installDayOffDom() {
    appendNode("input", "dayOffPicker");
    appendNode("button", "addDayOffBtn");
    appendNode("div", "dayOffList");
}

test("shared settings contracts accept day off dates", () => {
    const SETTINGS = parseSettings({ days_off: ["2026-05-30"] });

    assert.deepEqual(SETTINGS.days_off, ["2026-05-30"]);
});

test("dayOffDatesFromInput expands date ranges inclusively", () => {
    assert.deepEqual(dayOffDatesFromInput("2026-05-30 to 2026-06-02"), [
        "2026-05-30",
        "2026-05-31",
        "2026-06-01",
        "2026-06-02",
    ]);
});

test("bindDayOffAddButton clears the picker after adding a day off", () => {
    installDayOffDom();
    let dayOffs = [];
    const INPUT = HARNESS.document.getElementById("dayOffPicker");
    INPUT.value = "2026-05-30";

    bindDayOffAddButton(
        () => dayOffs,
        (nextDayOffs) => {
            dayOffs = nextDayOffs;
        },
    );
    HARNESS.document.getElementById("addDayOffBtn").click();

    assert.deepEqual(dayOffs, ["2026-05-30"]);
    assert.equal(INPUT.value, "");
});

test("bindDayOffAddButton dispatches a settings change after adding dates", () => {
    installDayOffDom();
    let changeCount = 0;
    let dayOffs = [];
    const INPUT = HARNESS.document.getElementById("dayOffPicker");
    INPUT.value = "2026-05-30";
    INPUT.addEventListener("change", () => {
        changeCount += 1;
    });

    bindDayOffAddButton(
        () => dayOffs,
        (nextDayOffs) => {
            dayOffs = nextDayOffs;
        },
    );
    HARNESS.document.getElementById("addDayOffBtn").click();

    assert.equal(changeCount, 1);
});

test("bindDayOffAddButton expands ranges into sorted unique dates", () => {
    installDayOffDom();
    let dayOffs = ["2026-05-31"];
    const INPUT = HARNESS.document.getElementById("dayOffPicker");
    INPUT.value = "2026-05-30 to 2026-06-01";

    bindDayOffAddButton(
        () => dayOffs,
        (nextDayOffs) => {
            dayOffs = nextDayOffs;
        },
    );
    HARNESS.document.getElementById("addDayOffBtn").click();

    assert.deepEqual(dayOffs, ["2026-05-30", "2026-05-31", "2026-06-01"]);
    assert.equal(INPUT.value, "");
});

test("renderDayOffs dispatches a settings change after removing dates", () => {
    installDayOffDom();
    let changeCount = 0;
    let dayOffs = ["2026-05-30"];
    const LIST = HARNESS.document.getElementById("dayOffList");
    LIST.addEventListener("change", () => {
        changeCount += 1;
    });

    renderDayOffs(dayOffs, (nextDayOffs) => {
        dayOffs = nextDayOffs;
    });
    LIST.children[0].click();

    assert.deepEqual(dayOffs, []);
    assert.equal(changeCount, 1);
});
