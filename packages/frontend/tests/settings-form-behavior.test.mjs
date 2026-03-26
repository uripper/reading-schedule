// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";

import { installFakeDom } from "./helpers/fake-dom.mjs";

const HARNESS = installFakeDom();
const { DIFFICULTY_LEVEL_COUNT, FIELDS, WEEKDAYS } = await import(
    "../dist/renderer/settings/config.js"
);
const { bindDayOffAddButton } = await import(
    "../dist/renderer/settings/day_offs.js"
);
const { collectSettingsForm } = await import(
    "../dist/renderer/settings/serialize_collect.js"
);
const { fillSettingsForm } = await import(
    "../dist/renderer/settings/serialize_fill.js"
);
const {
    minimumPlannerStartDate,
} = await import("../dist/renderer/settings/start_date.js");

after(() => {
    HARNESS.restore();
});

function appendNode(tagName, id, type = "text") {
    const NODE = HARNESS.createElement(tagName, id);
    if (NODE instanceof globalThis.HTMLInputElement) {
        NODE.type = type;
    }
    HARNESS.document.body.append(NODE);
    return NODE;
}

function installSettingsDom() {
    appendNode("input", "dayOffPicker");
    appendNode("button", "addDayOffBtn");
    appendNode("div", "dayOffList");
    for (const GROUP of Object.values(FIELDS)) {
        for (const FIELD of GROUP) {
            if (FIELD.type === "select") {
                appendNode("select", FIELD.id);
                continue;
            }
            let TYPE = "text";
            if (FIELD.type === "checkbox") {
                TYPE = "checkbox";
            }
            appendNode("input", FIELD.id, TYPE);
        }
    }
    for (const [KEY] of WEEKDAYS) {
        appendNode("input", `minutes_${KEY}`, "text");
    }
    for (let level = 1; level <= DIFFICULTY_LEVEL_COUNT; level += 1) {
        appendNode("input", `diff_${level}`, "text");
    }
}

test("settings fill keeps start date visually blank when unset", () => {
    installSettingsDom();
    fillSettingsForm({}, () => undefined);

    assert.equal(HARNESS.document.getElementById("start_date").value, "");
});

test("collectSettingsForm still defaults blank start date to today", () => {
    installSettingsDom();

    const SETTINGS = collectSettingsForm([]);

    assert.equal(SETTINGS.start_date, minimumPlannerStartDate());
});

test("bindDayOffAddButton clears the picker after adding a day off", () => {
    installSettingsDom();
    let dayOffs = [];
    const INPUT = HARNESS.document.getElementById("dayOffPicker");
    INPUT.value = "Mon";

    bindDayOffAddButton(() => dayOffs, (nextDayOffs) => {
        dayOffs = nextDayOffs;
    });
    HARNESS.document.getElementById("addDayOffBtn").click();

    assert.deepEqual(dayOffs, ["Mon"]);
    assert.equal(INPUT.value, "");
});

test("settings UI no longer exposes planner solver profile choices", () => {
    assert.equal(
        FIELDS.budget.some((field) => field.id === "planner_solver_profile"),
        false,
    );
});

test("shared desktop html no longer ships native date inputs", () => {
    const FRONTEND_HTML = readFileSync(
        new URL("../index.html", import.meta.url),
        "utf8",
    );
    const APP_HTML = readFileSync(
        new URL("../../../apps/bartleby/index.html", import.meta.url),
        "utf8",
    );

    assert.equal(FRONTEND_HTML.includes('type="date"'), false);
    assert.equal(APP_HTML.includes('type="date"'), false);
});
