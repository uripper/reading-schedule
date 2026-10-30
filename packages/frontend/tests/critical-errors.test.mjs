// biome-ignore-all lint/correctness/noUnresolvedImports: tests exercise built frontend artifacts.
/** Verifies persistent, independent errors without focus theft or unsafe markup. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    createCriticalStatusSetter,
    createPersistFeedback,
} from "../dist/renderer/app/critical-feedback.js";
import { createCriticalErrors } from "../dist/renderer/errors/index.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

function feedback(harness) {
    const ROOT = harness.createElement("section");
    const ERRORS = createCriticalErrors(ROOT);
    const STATUS = createCriticalStatusSetter(ERRORS, () => undefined);
    return {
        errors: ERRORS,
        planner: ROOT.children[1],
        save: ROOT.children[0],
        saved: createPersistFeedback(ERRORS, () => undefined),
        status: STATUS,
    };
}

test("unrelated planner status cannot hide a failed save", () => {
    const DOM = installFakeDom();
    try {
        const FLOW = feedback(DOM);
        FLOW.saved(false);
        FLOW.status("Updating Schedule", false, "loading");
        FLOW.status("Schedule Updated", false, "success");
        assert.equal(
            FLOW.save.textContent,
            "Your changes could not be saved. Please try again.",
        );
        assert.equal(FLOW.save.attributes.get("role"), "alert");
        assert.equal(FLOW.save.attributes.get("aria-atomic"), "true");
        assert.equal(FLOW.save.focusCalls, 0);
    } finally {
        DOM.restore();
    }
});

test("save recovery clears only the persistence error", () => {
    const DOM = installFakeDom();
    try {
        const FLOW = feedback(DOM);
        FLOW.status("Failed to generate plan", true, "error");
        FLOW.saved(false);
        FLOW.saved(true);
        assert.equal(FLOW.save.textContent, "");
        assert.equal(FLOW.planner.textContent, "Failed to generate plan");
        FLOW.status("Updating Schedule", false, "loading");
        assert.equal(FLOW.planner.textContent, "Failed to generate plan");
        FLOW.status("Schedule Updated", false, "success");
        assert.equal(FLOW.planner.textContent, "");
    } finally {
        DOM.restore();
    }
});

test("repeated failures reuse live regions and display details as text", () => {
    const DOM = installFakeDom();
    try {
        const ROOT = DOM.createElement("section");
        const ERRORS = createCriticalErrors(ROOT);
        const MESSAGE = "<script>unsafe()</script>";
        ERRORS.show("planner", MESSAGE);
        ERRORS.show("planner", MESSAGE);
        assert.equal(ROOT.children.length, 2);
        assert.equal(ROOT.children[1].textContent, MESSAGE);
        assert.equal(ROOT.children[1].children.length, 0);
    } finally {
        DOM.restore();
    }
});
