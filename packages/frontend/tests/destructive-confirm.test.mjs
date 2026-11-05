import assert from "node:assert/strict";
import test from "node:test";

import { confirmDestructiveAction } from "../dist/renderer/confirm/action-confirm.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

function confirmOptions() {
    return {
        confirmLabel: "Remove",
        message: "Remove this item?",
        title: "Remove Item",
    };
}

function installRemoveChild(environment) {
    const BODY = environment.document.body;
    BODY.removeChild = (node) => {
        BODY.children = BODY.children.filter((child) => child !== node);
        return node;
    };
}

test("destructive confirmation resolves true only after confirm action", async () => {
    const ENVIRONMENT = installFakeDom();
    try {
        installRemoveChild(ENVIRONMENT);
        const CONFIRMATION = confirmDestructiveAction(confirmOptions());
        const DIALOG = ENVIRONMENT.document.body.querySelector(
            ".action-confirm-dialog",
        );
        assert.equal(
            DIALOG.querySelector(".action-confirm-warning").textContent,
            "This action cannot be undone.",
        );
        const ACCEPT = DIALOG.querySelector(".action-confirm-accept");
        assert.ok(ACCEPT.classList.contains("btn-remove"));
        assert.ok(ACCEPT.classList.contains("btn-primary"));
        ACCEPT.click();
        assert.equal(await CONFIRMATION, true);
        assert.equal(
            ENVIRONMENT.document.body.querySelector(".action-confirm-dialog"),
            null,
        );
    } finally {
        ENVIRONMENT.restore();
    }
});

test("destructive confirmation cancel resolves false", async () => {
    const ENVIRONMENT = installFakeDom();
    try {
        installRemoveChild(ENVIRONMENT);
        const CONFIRMATION = confirmDestructiveAction(confirmOptions());
        const DIALOG = ENVIRONMENT.document.body.querySelector(
            ".action-confirm-dialog",
        );
        const CANCEL = DIALOG.querySelector(".action-confirm-cancel");
        assert.ok(CANCEL.classList.contains("btn-cancel"));
        CANCEL.click();
        assert.equal(await CONFIRMATION, false);
    } finally {
        ENVIRONMENT.restore();
    }
});
