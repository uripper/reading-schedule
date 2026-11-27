import assert from "node:assert/strict";
import test from "node:test";

import { baseQueueArgs } from "./helpers/persistence.mjs";
import {
    SOURCE_ID,
    TARGET_ID,
    catalog,
    installDialogDocument,
    switchDeps,
    workspaceLoad,
} from "./helpers/workspaces.mjs";

const { switchWorkspace } =
    await import("../dist/renderer/workspaces/workspace-switch.js");
const STORE = await import("../dist/renderer/workspaces/workspace-store.js");
const { createPersistQueue } =
    await import("../dist/renderer/app/persist-queue.js");
const { bindSaveRecovery, handleRejectedSave } =
    await import("../dist/renderer/workspaces/workspace-save-recovery.js");

/** Shows the source workspace, as after loading it. */
function startInSource() {
    STORE.setLoadedWorkspace({
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 1,
        workspaceId: SOURCE_ID,
    });
    STORE.finishApplyingWorkspace(SOURCE_ID);
}

async function switchTo(deps, workspaceId) {
    const RESTORE = installDialogDocument();
    try {
        return await switchWorkspace(deps, workspaceId);
    } finally {
        RESTORE();
    }
}

function flushAsync() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

test("the shown workspace follows the load even before the host records the choice", async () => {
    startInSource();
    const STALE_CATALOG_LOAD = {
        ...workspaceLoad(TARGET_ID),
        catalog: catalog(SOURCE_ID),
    };
    const { DEPS } = switchDeps({ load: STALE_CATALOG_LOAD });
    assert.equal(await switchTo(DEPS, TARGET_ID), true);
    assert.equal(STORE.activeWorkspaceId(), TARGET_ID);
    assert.equal(STORE.appliedWorkspaceId(), TARGET_ID);
    STORE.setWorkspaceCatalog(catalog(SOURCE_ID));
    assert.equal(STORE.activeWorkspaceId(), TARGET_ID);
});

test("an archived shown workspace hands over to the host's replacement", () => {
    startInSource();
    const ARCHIVED = catalog(TARGET_ID);
    ARCHIVED.workspaces[0] = { ...ARCHIVED.workspaces[0], archived: true };
    STORE.setWorkspaceCatalog(ARCHIVED);
    assert.equal(STORE.activeWorkspaceId(), TARGET_ID);
});

test("saves are held back while a workspace is half on screen", async () => {
    startInSource();
    let appliedDuringApply = "unset";
    const { DEPS } = switchDeps({
        deps: {
            applyState: () => {
                appliedDuringApply = STORE.appliedWorkspaceId();
                return Promise.resolve();
            },
        },
    });
    await switchTo(DEPS, TARGET_ID);
    assert.equal(appliedDuringApply, null);
    assert.equal(STORE.appliedWorkspaceId(), TARGET_ID);
});

test("a failed switch puts the previous workspace back instead of mixing data", async () => {
    startInSource();
    let applyCount = 0;
    const { CALLS, DEPS, STATE } = switchDeps({
        deps: {
            applyState: () => {
                applyCount += 1;
                if (applyCount === 1) {
                    return Promise.reject(
                        new Error("settings could not be shown"),
                    );
                }
                return Promise.resolve();
            },
        },
    });
    assert.equal(await switchTo(DEPS, TARGET_ID), false);
    assert.equal(CALLS.includes(`load:${SOURCE_ID}`), true);
    assert.equal(STORE.activeWorkspaceId(), SOURCE_ID);
    assert.equal(STORE.appliedWorkspaceId(), SOURCE_ID);
    assert.equal(STATE.ready, true);
    assert.match(CALLS.at(-1), /stayed in Career/u);
});

test("saves carry the workspace on screen and wait while none is", async () => {
    const SAVED = [];
    let shown = null;
    const QUEUE = createPersistQueue({
        ...baseQueueArgs((payload) => {
            SAVED.push(payload);
            return Promise.resolve({ ok: true });
        }),
        collectWorkspaceId: () => shown,
    });
    assert.equal(await QUEUE.persistDraft(), false);
    assert.equal(SAVED.length, 0);
    shown = TARGET_ID;
    assert.equal(await QUEUE.persistDraft(), true);
    assert.equal(SAVED[0].workspace_id, TARGET_ID);
});

test("a save refused as out of date reloads the workspace instead of failing forever", async () => {
    const CALLS = [];
    bindSaveRecovery({
        deps: {
            context: {
                persistDraft: () => {
                    CALLS.push("save");
                    return Promise.resolve(true);
                },
                setStatus: (message) => CALLS.push(`status:${message}`),
            },
        },
        reloadActive: () => {
            CALLS.push("reload");
            return Promise.resolve();
        },
    });
    handleRejectedSave("Disk is full.");
    await flushAsync();
    assert.deepEqual(CALLS, []);
    handleRejectedSave("WORKSPACE_OUT_OF_SYNC: Nothing was saved.");
    handleRejectedSave("STALE_WORKSPACE_REVISION: Reload first.");
    await flushAsync();
    assert.deepEqual(CALLS.slice(0, 2), ["reload", "save"]);
    assert.equal(CALLS.filter((call) => call === "reload").length, 1);
});
