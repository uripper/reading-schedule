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

test("finalizeInitialLoad preserves legacy lastResult schedules", () => {
    const DOM = installFakeDom();
    try {
        const SETTINGS_PANEL = DOM.createElement("section", "tab-settings");
        DOM.document.body.append(SETTINGS_PANEL);
        const LOGS = [];
        let autoPlanCount = 0;

        finalizeInitialLoad({
            addLog: (message) => {
                LOGS.push(message);
            },
            loadResult: loadResult(),
            queueAutoPlan: () => {
                autoPlanCount += 1;
            },
            queuePersist: () => undefined,
            saved: legacySavedState(),
            setReady: () => undefined,
            setStatus: () => undefined,
        });

        assert.equal(autoPlanCount, 0);
        assert.equal(
            LOGS.some((entry) =>
                entry.includes("Skipped startup auto-plan"),
            ),
            true,
        );
    } finally {
        DOM.restore();
    }
});
