// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { finalizeInitialLoad } from "../dist/renderer/app/init/init-helpers.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

function legacySavedState() {
    return {
        books: [],
        lastResult: {
            created_at: "2026-05-01T12:00:00.000Z",
            schedule: [
                {
                    book_id: "book-1",
                    date: "2026-05-01",
                    minutes: 20,
                    session_index: 0,
                    title: "Legacy Book",
                    words_planned: 100,
                },
            ],
            summary: null,
        },
        settings: { start_date: "2026-05-01" },
    };
}

function loadResult() {
    return {
        source: "sqlite",
        sourcePath:
            "C:/Users/example/AppData/Roaming/Bartleby/planner_state.sqlite3",
        state: legacySavedState(),
    };
}

function finalizeLoadedSchedule() {
    const STATE = {
        autoPlanCount: 0,
        logs: [],
        ready: false,
    };
    finalizeInitialLoad({
        addLog: (message) => {
            STATE.logs.push(message);
        },
        loadResult: loadResult(),
        queueAutoPlan: () => {
            assert.equal(STATE.ready, true);
            STATE.autoPlanCount += 1;
        },
        queuePersist: () => undefined,
        saved: legacySavedState(),
        setReady: () => {
            STATE.ready = true;
        },
        setStatus: () => undefined,
    });
    return STATE;
}

test("finalizeInitialLoad replans after restoring a saved schedule", () => {
    const DOM = installFakeDom();
    try {
        const SETTINGS_PANEL = DOM.createElement("section", "tab-settings");
        DOM.document.body.append(SETTINGS_PANEL);
        const STATE = finalizeLoadedSchedule();
        assert.equal(STATE.autoPlanCount, 1);
        assert.equal(
            STATE.logs.some((entry) =>
                entry.includes("Queued startup reschedule"),
            ),
            true,
        );
    } finally {
        DOM.restore();
    }
});
