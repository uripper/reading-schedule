// biome-ignore-all lint/correctness/noUnresolvedImports: tests exercise built frontend artifacts.
/** Exercises visible retry controls with real persistence and scoped recovery. */
import assert from "node:assert/strict";
import test from "node:test";
import { createPersistFeedback } from "../dist/renderer/app/critical-feedback.js";
import { createPersistQueue } from "../dist/renderer/app/persist-queue.js";
import {
    createAppErrorSurface,
    SAVE_FAILURE_MESSAGE,
} from "../dist/renderer/errors/index.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";
import { baseQueueArgs } from "./helpers/persistence.mjs";

function recovery(harness) {
    const ROOT = harness.createElement("section");
    const MAIN = harness.createElement("main");
    const SURFACE = createAppErrorSurface(ROOT, MAIN);
    return {
        ...SURFACE,
        help: ROOT.querySelector(".critical-error-help"),
        main: MAIN,
        retry: ROOT.children[2].children[0],
        saved: createPersistFeedback(SURFACE.errors, () => undefined),
    };
}

function recoveryQueue(flow, snapshots, collectBooks) {
    return createPersistQueue({
        ...baseQueueArgs((snapshot) => {
            snapshots.push(snapshot);
            return Promise.resolve({ ok: snapshots.length > 1 });
        }),
        collectBooks,
        onPersistResult: flow.saved,
    });
}

test("Retry save uses the latest state and preserves a separate planner error", async () => {
    const DOM = installFakeDom();
    try {
        const FLOW = recovery(DOM);
        let title = "Original";
        const SNAPSHOTS = [];
        const QUEUE = recoveryQueue(FLOW, SNAPSHOTS, () => [
            { book_id: "book-1", title },
        ]);
        FLOW.bindRetrySave(QUEUE.flushPendingState);
        await QUEUE.persistDraft();
        FLOW.errors.show("planner", "Plan incomplete.");
        title = "Edited after failure";
        DOM.document.activeElement = FLOW.retry;
        await FLOW.retry.onclick();
        assert.equal(SNAPSHOTS[1].books[0].title, title);
        assert.equal(FLOW.retry.hidden, true);
        assert.equal(FLOW.help.hidden, false);
        assert.equal(FLOW.main.focusCalls, 1);
    } finally {
        DOM.restore();
    }
});

test("retry stays focusable and prevents repeated submissions while saving", async () => {
    const DOM = installFakeDom();
    try {
        const FLOW = recovery(DOM);
        let finish;
        let calls = 0;
        FLOW.bindRetrySave(() => {
            calls += 1;
            return new Promise((resolve) => {
                finish = resolve;
            });
        });
        FLOW.errors.show("persistence", SAVE_FAILURE_MESSAGE);
        const PENDING = FLOW.retry.onclick();
        await FLOW.retry.onclick();
        assert.equal(calls, 1);
        assert.equal(FLOW.retry.disabled, false);
        assert.equal(FLOW.retry.attributes.get("aria-disabled"), "true");
        finish(false);
        await PENDING;
        assert.equal(FLOW.retry.hidden, false);
        assert.equal(FLOW.retry.attributes.get("aria-disabled"), "false");
    } finally {
        DOM.restore();
    }
});

test("an unexpected retry exception leaves an actionable error", async () => {
    const DOM = installFakeDom();
    try {
        const FLOW = recovery(DOM);
        FLOW.bindRetrySave(() =>
            Promise.reject(new Error("Device unavailable")),
        );
        await FLOW.retry.onclick();
        assert.equal(FLOW.retry.hidden, false);
        assert.equal(FLOW.help.hidden, false);
        assert.equal(FLOW.retry.attributes.get("aria-disabled"), "false");
    } finally {
        DOM.restore();
    }
});

test("Help/Logs invokes the existing dialog action without submitting a form", () => {
    const DOM = installFakeDom();
    try {
        const FLOW = recovery(DOM);
        const HELP = DOM.createElement("button", "helpBtn");
        let opens = 0;
        HELP.onclick = () => {
            opens += 1;
        };
        DOM.document.body.append(HELP);
        FLOW.help.click();
        assert.equal(opens, 1);
        assert.equal(FLOW.help.type, "button");
        assert.equal(FLOW.help.textContent, "Help/Logs");
        assert.equal(FLOW.retry.textContent, "Retry save");
    } finally {
        DOM.restore();
    }
});
