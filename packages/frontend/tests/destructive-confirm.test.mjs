// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { confirmDestructiveAction } from "../dist/renderer/confirm/destructive-confirm.js";
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
            ".danger-confirm-dialog",
        );
        DIALOG.querySelector(".danger-confirm-accept").click();
        assert.equal(await CONFIRMATION, true);
        assert.equal(
            ENVIRONMENT.document.body.querySelector(".danger-confirm-dialog"),
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
            ".danger-confirm-dialog",
        );
        DIALOG.querySelector(".danger-confirm-cancel").click();
        assert.equal(await CONFIRMATION, false);
    } finally {
        ENVIRONMENT.restore();
    }
});
