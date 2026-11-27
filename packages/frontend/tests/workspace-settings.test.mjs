/** Settings → Workspaces: row copy and order, settings sources, delete flow. */
import assert from "node:assert/strict";
import test from "node:test";

import { chooseWorkspaceDelete } from "../dist/renderer/workspaces/workspace-settings-delete.js";
import {
    DEFAULT_SETTINGS_SOURCE,
    deleteDestination,
    normalizedWorkspaceName,
    settingsSourceOptions,
    workspaceErrorText,
    workspaceInfoText,
    workspaceSettingsRows,
} from "../dist/renderer/workspaces/workspace-settings-model.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

function workspace(id, overrides = {}) {
    return {
        archived: false,
        bookCount: 2,
        createdAt: "2026-01-01T00:00:00Z",
        id,
        name: id.toUpperCase(),
        revision: 1,
        ...overrides,
    };
}

function catalog(activeWorkspaceId, workspaces) {
    return { activeWorkspaceId, workspaces };
}

test("info text counts books", () => {
    assert.equal(workspaceInfoText(workspace("a")), "2 books");
    assert.equal(workspaceInfoText(workspace("a", { bookCount: 1 })), "1 book");
});

test("rows list the active workspace first and spell out status", () => {
    const ROWS = workspaceSettingsRows(
        catalog("b", [
            workspace("a", { archived: true }),
            workspace("b"),
            workspace("c"),
        ]),
    );
    assert.deepEqual(
        ROWS.map((row) => [row.workspace.id, row.statusText, row.canOpen]),
        [
            ["b", "Active", false],
            ["a", "Archived", false],
            ["c", "", true],
        ],
    );
});

test("settings sources start with Bartleby defaults and skip archived workspaces", () => {
    const OPTIONS = settingsSourceOptions(
        catalog("a", [workspace("a"), workspace("b", { archived: true })]),
    );
    assert.deepEqual(OPTIONS, [
        { label: "Bartleby defaults", value: DEFAULT_SETTINGS_SOURCE },
        { label: "A", value: "a" },
    ]);
    assert.deepEqual(settingsSourceOptions(null), [
        { label: "Bartleby defaults", value: DEFAULT_SETTINGS_SOURCE },
    ]);
});

test("delete destination prefers the active workspace, else the first usable other", () => {
    const CATALOG = catalog("b", [
        workspace("a", { archived: true }),
        workspace("b"),
        workspace("c"),
        workspace("d"),
    ]);
    assert.equal(deleteDestination(CATALOG, "c")?.id, "b");
    assert.equal(deleteDestination(CATALOG, "a")?.id, "b");
    assert.equal(deleteDestination(CATALOG, "b")?.id, "c");
});

test("delete destination is null for empty workspaces or without another usable one", () => {
    const EMPTY = catalog("a", [
        workspace("a"),
        workspace("b", { bookCount: 0 }),
    ]);
    assert.equal(deleteDestination(EMPTY, "b"), null);
    const LONE = catalog("a", [
        workspace("a"),
        workspace("b", { archived: true }),
    ]);
    assert.equal(deleteDestination(LONE, "a"), null);
    assert.equal(deleteDestination(LONE, "missing"), null);
});

test("names are trimmed and blank names rejected", () => {
    assert.equal(normalizedWorkspaceName("  Career  "), "Career");
    assert.equal(normalizedWorkspaceName("   "), null);
});

test("host errors become readable status text", () => {
    assert.equal(
        workspaceErrorText("Keep at least one workspace."),
        "Keep at least one workspace.",
    );
    assert.equal(workspaceErrorText(new Error("boom")), "boom");
    assert.equal(workspaceErrorText(undefined), "Unknown workspace error.");
});

function installRemoveChild(environment) {
    const BODY = environment.document.body;
    BODY.removeChild = (node) => {
        BODY.children = BODY.children.filter((child) => child !== node);
        return node;
    };
}

function clickDialogButton(environment, selector) {
    const DIALOG = environment.document.body.querySelector(
        ".action-confirm-dialog",
    );
    DIALOG.querySelector(selector).click();
    return DIALOG;
}

async function withConfirmDom(run) {
    const ENVIRONMENT = installFakeDom();
    try {
        installRemoveChild(ENVIRONMENT);
        await run(ENVIRONMENT);
    } finally {
        ENVIRONMENT.restore();
    }
}

test("accepting the move offer deletes with a transfer to the destination", async () => {
    await withConfirmDom(async (environment) => {
        const CATALOG = catalog("a", [workspace("a"), workspace("b")]);
        const CHOICE = chooseWorkspaceDelete(CATALOG, CATALOG.workspaces[1]);
        const DIALOG = clickDialogButton(environment, ".action-confirm-accept");
        assert.match(
            DIALOG.querySelector(".action-confirm-warning").textContent,
            /sessions, completed sessions, and stats/,
        );
        assert.deepEqual(await CHOICE, {
            kind: "delete",
            transferBooksTo: "a",
        });
    });
});

test("declining the move offer falls back to deleting the books too", async () => {
    await withConfirmDom(async (environment) => {
        const CATALOG = catalog("a", [workspace("a"), workspace("b")]);
        const CHOICE = chooseWorkspaceDelete(CATALOG, CATALOG.workspaces[1]);
        clickDialogButton(environment, ".action-confirm-cancel");
        await new Promise((resolve) => {
            setImmediate(resolve);
        });
        const DIALOG = clickDialogButton(environment, ".action-confirm-accept");
        assert.match(
            DIALOG.querySelector(".action-confirm-message").textContent,
            /all of its books/,
        );
        assert.deepEqual(await CHOICE, {
            kind: "delete",
            transferBooksTo: null,
        });
    });
});

test("cancelling the destructive confirmation keeps the workspace", async () => {
    await withConfirmDom(async (environment) => {
        const CATALOG = catalog("a", [
            workspace("a"),
            workspace("b", { bookCount: 0 }),
        ]);
        const CHOICE = chooseWorkspaceDelete(CATALOG, CATALOG.workspaces[1]);
        clickDialogButton(environment, ".action-confirm-cancel");
        assert.deepEqual(await CHOICE, { kind: "cancel" });
    });
});
