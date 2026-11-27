import assert from "node:assert/strict";
import test from "node:test";

import {
    ALL_WORKSPACES_ID,
    SOURCE_ID,
    TARGET_ID,
    catalog,
    combinedLoad,
    installDialogDocument,
    switchDeps,
} from "./helpers/workspaces.mjs";

const { switchWorkspace } =
    await import("../dist/renderer/workspaces/workspace-switch.js");
const STORE = await import("../dist/renderer/workspaces/workspace-store.js");

function flushAsync() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

async function openAll(bookWorkspaces) {
    STORE.setLoadedWorkspace({
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 1,
        workspaceId: SOURCE_ID,
    });
    const { CALLS, DEPS } = switchDeps({ load: combinedLoad(bookWorkspaces) });
    const RESTORE = installDialogDocument();
    try {
        assert.equal(await switchWorkspace(DEPS, ALL_WORKSPACES_ID), true);
        await flushAsync();
    } finally {
        RESTORE();
    }
    return CALLS;
}

test("All Workspaces reads every workspace and remembers the choice in the background", async () => {
    const CALLS = await openAll({ "book-1": TARGET_ID });
    assert.equal(CALLS.includes("loadAll"), true);
    assert.equal(CALLS.includes(`select:${ALL_WORKSPACES_ID}`), true);
    assert.equal(STORE.isViewingAllWorkspaces(), true);
    assert.equal(STORE.shownWorkspaceId(), ALL_WORKSPACES_ID);
});

test("books keep their own workspace in the All Workspaces view", async () => {
    await openAll({ "book-1": TARGET_ID, "book-2": SOURCE_ID });
    assert.equal(STORE.bookWorkspaceId("book-1"), TARGET_ID);
    assert.equal(STORE.bookWorkspaceId("book-2"), SOURCE_ID);
    assert.equal(STORE.bookWorkspaceId("book-new"), null);
    assert.equal(STORE.newBookWorkspaces(), undefined);
    STORE.assignNewBookWorkspace("book-new", TARGET_ID);
    assert.equal(STORE.bookWorkspaceId("book-new"), TARGET_ID);
    assert.deepEqual(STORE.newBookWorkspaces(), { "book-new": TARGET_ID });
});

test("opening one workspace from All Workspaces shows only that workspace", async () => {
    await openAll({});
    STORE.assignNewBookWorkspace("book-new", TARGET_ID);
    const { CALLS, DEPS } = switchDeps();
    const RESTORE = installDialogDocument();
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), true);
        await flushAsync();
    } finally {
        RESTORE();
    }
    assert.equal(CALLS.includes(`load:${TARGET_ID}`), true);
    assert.equal(CALLS.includes(`select:${TARGET_ID}`), true);
    assert.equal(STORE.isViewingAllWorkspaces(), false);
    assert.equal(STORE.newBookWorkspaces(), undefined);
    assert.equal(STORE.bookWorkspaceId("book-9"), TARGET_ID);
});

test("move destinations leave out the books' own workspace", () => {
    STORE.setWorkspaceCatalog(catalog(SOURCE_ID));
    assert.deepEqual(
        STORE.moveDestinations(SOURCE_ID).map((workspace) => workspace.id),
        [TARGET_ID],
    );
    assert.deepEqual(
        STORE.moveDestinations(null).map((workspace) => workspace.id),
        [SOURCE_ID, TARGET_ID],
    );
});

test("the shown workspace follows the load even before the host records the choice", async () => {
    STORE.setLoadedWorkspace({
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 1,
        workspaceId: SOURCE_ID,
    });
    // The host reads the destination first; its catalog still names the old choice.
    const STALE_CATALOG_LOAD = {
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 2,
        state: { books: [], last_result: null, settings: {} },
        workspaceId: TARGET_ID,
    };
    const { DEPS } = switchDeps({ load: STALE_CATALOG_LOAD });
    const RESTORE = installDialogDocument();
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), true);
    } finally {
        RESTORE();
    }
    assert.equal(STORE.activeWorkspaceId(), TARGET_ID);
    assert.equal(STORE.shownWorkspaceId(), TARGET_ID);
    assert.equal(STORE.bookWorkspaceId("book-1"), TARGET_ID);
    STORE.setWorkspaceCatalog(catalog(SOURCE_ID));
    assert.equal(STORE.activeWorkspaceId(), TARGET_ID);
});

test("an archived shown workspace hands over to the host's replacement", () => {
    STORE.setLoadedWorkspace({
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 1,
        workspaceId: TARGET_ID,
    });
    const ARCHIVED = catalog(SOURCE_ID);
    ARCHIVED.workspaces[1] = { ...ARCHIVED.workspaces[1], archived: true };
    STORE.setWorkspaceCatalog(ARCHIVED);
    assert.equal(STORE.activeWorkspaceId(), SOURCE_ID);
});
