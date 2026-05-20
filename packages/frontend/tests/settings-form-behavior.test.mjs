// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";

import { installFakeDom } from "./helpers/fake-dom.mjs";

const HARNESS = installFakeDom();
const { FIELDS, WEEKDAYS } = await import(
    "../dist/renderer/settings/config.js"
);
const { bindDayOffAddButton } = await import(
    "../dist/renderer/settings/day_offs.js"
);
const { parseSettings } = await import("@reading-schedule/contracts");
const { collectSettingsForm } = await import(
    "../dist/renderer/settings/serialize_collect.js"
);
const { fillSettingsForm } = await import(
    "../dist/renderer/settings/serialize_fill.js"
);
const {
    DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY,
    DEFAULT_PLAN_MODE,
    DEFAULT_TIME_QUANTUM_MINUTES,
} = await import("../dist/renderer/settings/defaults.js");
const { minimumPlannerStartDate } = await import(
    "../dist/renderer/settings/start_date.js"
);

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

function inputTypeForField(field) {
    if (field.type === "checkbox") {
        return "checkbox";
    }
    return "text";
}

function appendFieldNode(field) {
    if (field.type === "select") {
        appendNode("select", field.id);
        return;
    }
    appendNode("input", field.id, inputTypeForField(field));
}

function appendSettingsFieldNodes() {
    for (const GROUP of Object.values(FIELDS)) {
        for (const FIELD of GROUP) {
            appendFieldNode(FIELD);
        }
    }
}

function installSettingsDom() {
    appendNode("input", "dayOffPicker");
    appendNode("button", "addDayOffBtn");
    appendNode("div", "dayOffList");
    appendSettingsFieldNodes();
    for (const [KEY] of WEEKDAYS) {
        appendNode("input", `minutes_${KEY}`, "text");
    }
}

test("settings fill shows core planning defaults when unset", () => {
    installSettingsDom();
    fillSettingsForm({}, () => undefined);

    assert.equal(
        HARNESS.document.getElementById("minutes_per_day").value,
        "30",
    );
    assert.equal(HARNESS.document.getElementById("wpm_base").value, "250");
});

test("collectSettingsForm still defaults blank start date to today", () => {
    installSettingsDom();

    const SETTINGS = collectSettingsForm([]);

    assert.equal(SETTINGS.start_date, minimumPlannerStartDate());
});

test("collectSettingsForm applies hidden planner defaults", () => {
    installSettingsDom();
    HARNESS.document.getElementById("max_books_per_day").value = "3";

    const SETTINGS = collectSettingsForm([]);

    assert.equal(SETTINGS.max_sessions_per_day, 3);
    assert.equal(
        SETTINGS.max_blocks_per_book_per_day,
        DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY,
    );
    assert.equal(SETTINGS.plan_mode, DEFAULT_PLAN_MODE);
    assert.equal(SETTINGS.time_quantum_minutes, DEFAULT_TIME_QUANTUM_MINUTES);
});

test("collectSettingsForm leaves blank weekday minutes as default-day budget", () => {
    installSettingsDom();
    HARNESS.document.getElementById("minutes_Mon").value = "";
    HARNESS.document.getElementById("minutes_Tue").value = "45";

    const SETTINGS = collectSettingsForm([]);

    assert.deepEqual(SETTINGS.minutes_by_weekday, { Tue: 45 });
    assert.deepEqual(parseSettings(SETTINGS).minutes_by_weekday, { Tue: 45 });
});

test("bindDayOffAddButton clears the picker after adding a day off", () => {
    installSettingsDom();
    let dayOffs = [];
    const INPUT = HARNESS.document.getElementById("dayOffPicker");
    INPUT.value = "Mon";

    bindDayOffAddButton(
        () => dayOffs,
        (nextDayOffs) => {
            dayOffs = nextDayOffs;
        },
    );
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

test("settings UI no longer exposes advanced planner categories", () => {
    assert.equal(Object.hasOwn(FIELDS, "weights"), false);
    assert.equal(Object.hasOwn(FIELDS, "window"), false);
});

function assertHtmlRemovedOldSettings(html) {
    assert.equal(html.includes("Optimization"), false);
    assert.equal(html.includes("Reading Speed by Difficulty"), false);
    assert.equal(html.includes('id="flagGamification"'), false);
    assert.equal(html.includes('value="light"'), false);
    assert.equal(html.includes('id="windowGrid"'), false);
    assert.equal(html.includes('id="weightsGrid"'), false);
}

test("shared desktop html only ships simplified settings controls", () => {
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
    assert.equal(
        FRONTEND_HTML.includes("https://www.readinglength.com/wpm"),
        true,
    );
    assert.equal(APP_HTML.includes("https://www.readinglength.com/wpm"), true);
    assertHtmlRemovedOldSettings(FRONTEND_HTML);
    assertHtmlRemovedOldSettings(APP_HTML);
});
