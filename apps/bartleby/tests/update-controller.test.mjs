import assert from "node:assert/strict";
import test from "node:test";

import { createAppUpdateController } from "../src/updater/update-controller.ts";

const CURRENT_VERSION = "0.1.2-alpha";
const UPDATE_VERSION = "0.1.3-alpha";

function updateCandidate(events, closeCalls) {
    return {
        body: "Safer saves and automatic updates.",
        close: () => {
            closeCalls.push("close");
            return Promise.resolve();
        },
        currentVersion: CURRENT_VERSION,
        downloadAndInstall: (report) => {
            events.push("download");
            report?.({ data: { contentLength: 10 }, event: "Started" });
            report?.({ data: { chunkLength: 10 }, event: "Progress" });
            report?.({ event: "Finished" });
            return Promise.resolve();
        },
        version: UPDATE_VERSION,
    };
}

function controllerFixture(candidates, saveResult = true) {
    const STATE = {
        errors: [],
        events: [],
        presentation: null,
        progress: [],
    };
    const CONTROLLER = createAppUpdateController({
        checkForUpdate: () => Promise.resolve(candidates.shift() ?? null),
        dialog: {
            show: (presentation) => {
                STATE.presentation = presentation;
            },
        },
        flushPendingState: () => {
            STATE.events.push("save");
            return Promise.resolve(saveResult);
        },
        relaunchApp: () => {
            STATE.events.push("relaunch");
            return Promise.resolve();
        },
        reportError: (message, error) => {
            STATE.errors.push([message, error]);
        },
    });
    return { controller: CONTROLLER, state: STATE };
}

function requirePresentation(state) {
    assert.notEqual(state.presentation, null);
    return state.presentation;
}

test("Later dismisses one version for the current session", async () => {
    const CLOSE_CALLS = [];
    const FIRST = updateCandidate([], CLOSE_CALLS);
    const SECOND = updateCandidate([], CLOSE_CALLS);
    const FIXTURE = controllerFixture([FIRST, SECOND]);
    await FIXTURE.controller.checkNow();
    requirePresentation(FIXTURE.state).onLater();
    await FIXTURE.controller.checkNow();
    assert.deepEqual(CLOSE_CALLS, ["close", "close"]);
    assert.equal(FIXTURE.state.errors.length, 0);
});

test("install saves before download and relaunch", async () => {
    const CLOSE_CALLS = [];
    const FIXTURE = controllerFixture([]);
    const CANDIDATE = updateCandidate(FIXTURE.state.events, CLOSE_CALLS);
    const CONTROLLER = controllerFixture([CANDIDATE]);
    CANDIDATE.downloadAndInstall = (report) => {
        CONTROLLER.state.events.push("download");
        report?.({ event: "Finished" });
        return Promise.resolve();
    };
    await CONTROLLER.controller.checkNow();
    const PRESENTATION = requirePresentation(CONTROLLER.state);
    await PRESENTATION.onInstall((progress) => {
        CONTROLLER.state.progress.push(progress.phase);
    });
    assert.deepEqual(CONTROLLER.state.events, ["save", "download", "relaunch"]);
    assert.deepEqual(CONTROLLER.state.progress, [
        "preparing",
        "installing",
        "restarting",
    ]);
});

test("install stops when the latest state cannot be saved", async () => {
    const EVENTS = [];
    const CANDIDATE = updateCandidate(EVENTS, []);
    const FIXTURE = controllerFixture([CANDIDATE], false);
    await FIXTURE.controller.checkNow();
    const PRESENTATION = requirePresentation(FIXTURE.state);
    await assert.rejects(PRESENTATION.onInstall(() => undefined));
    assert.deepEqual(FIXTURE.state.events, ["save"]);
    assert.deepEqual(EVENTS, []);
});
