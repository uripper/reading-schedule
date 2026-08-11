// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { configureTodayInteractions } from "../dist/renderer/app/today/today_carousel_render.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const INDEX_HTML = readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
);
const FOCUS_ACTIONS_CSS = readFileSync(
    new URL("../styles/today-focus-actions.css", import.meta.url),
    "utf8",
);
const NOOP = () => undefined;
const REPLAN_MESSAGE =
    "Replan Today's unfinished sessions.  If your Library hasn't changed, your plan likely won't either (For example, changing a scheduled book to have a lower priority may cause it to not be scheduled). This will also update your future reading plan.";

function todayBindings(onReplanToday) {
    return {
        listSessionBooks: () => [],
        onManualSessionAdded: NOOP,
        onReplanToday,
        onSessionCompletionChanged: NOOP,
        onSessionMinutesUpdated: NOOP,
        onSessionProgressUpdated: NOOP,
        onSessionRemoved: NOOP,
        rerender: NOOP,
        setStatus: NOOP,
    };
}

function installRemoveChild(environment) {
    const BODY = environment.document.body;
    BODY.removeChild = (node) => {
        BODY.children = BODY.children.filter((child) => child !== node);
        return node;
    };
}

function openReplanDialog(dom, onReplanToday) {
    dom.createElement("button", "todayReplanBtn");
    configureTodayInteractions(todayBindings(onReplanToday));
    dom.document.getElementById("todayReplanBtn").click();
    return dom.document.body.querySelector(".action-confirm-dialog");
}

async function allowConfirmationToFinish() {
    await Promise.resolve();
    await Promise.resolve();
}

function assertReplanDialogCopy(dialog) {
    const TITLE_BAR = dialog.querySelector(".action-confirm-titlebar");
    assert.equal(TITLE_BAR.querySelector("strong").textContent, "Replan Today");
    assert.equal(
        dialog.querySelector(".action-confirm-message").textContent,
        REPLAN_MESSAGE,
    );
    assert.equal(dialog.querySelector(".action-confirm-warning"), null);
    assert.equal(
        dialog.querySelector(".action-confirm-cancel").textContent,
        "CANCEL",
    );
    assert.equal(
        dialog.querySelector(".action-confirm-accept").textContent,
        "REPLAN TODAY",
    );
}

test("Today includes a labeled neobrutalist replan action", () => {
    assert.match(INDEX_HTML, /id="todayReplanBtn"/u);
    assert.match(INDEX_HTML, />\s*Replan Today\s*</u);
    assert.match(FOCUS_ACTIONS_CSS, /\.today-replan-btn\s*\{/u);
    assert.match(FOCUS_ACTIONS_CSS, /border:\s*3px solid #000/u);
    assert.match(FOCUS_ACTIONS_CSS, /box-shadow:\s*4px 4px 0 #000/u);
    const REPLAN_INDEX = INDEX_HTML.indexOf('id="todayReplanBtn"');
    const FOCUS_PANEL_INDEX = INDEX_HTML.indexOf('id="todayFocusPanel"');
    const REMOVE_INDEX = INDEX_HTML.indexOf('id="todayRemoveSessionBtn"');
    assert.ok(FOCUS_PANEL_INDEX < REPLAN_INDEX);
    assert.ok(REPLAN_INDEX < REMOVE_INDEX);
});

test("Today replan confirmation uses the requested copy", async () => {
    const DOM = installFakeDom();
    try {
        installRemoveChild(DOM);
        const DIALOG = openReplanDialog(DOM, NOOP);
        assertReplanDialogCopy(DIALOG);
        DIALOG.querySelector(".action-confirm-cancel").click();
        await allowConfirmationToFinish();
    } finally {
        DOM.restore();
    }
});

test("Today replan confirmation cancel keeps the plan unchanged", async () => {
    const DOM = installFakeDom();
    try {
        installRemoveChild(DOM);
        let callCount = 0;
        const DIALOG = openReplanDialog(DOM, () => {
            callCount += 1;
        });
        DIALOG.querySelector(".action-confirm-cancel").click();
        await allowConfirmationToFinish();
        assert.equal(callCount, 0);
    } finally {
        DOM.restore();
    }
});

test("Today replan confirmation invokes the explicit callback", async () => {
    const DOM = installFakeDom();
    try {
        installRemoveChild(DOM);
        let callCount = 0;
        const DIALOG = openReplanDialog(DOM, () => {
            callCount += 1;
        });
        DIALOG.querySelector(".action-confirm-accept").click();
        await allowConfirmationToFinish();
        assert.equal(callCount, 1);
    } finally {
        DOM.restore();
    }
});
