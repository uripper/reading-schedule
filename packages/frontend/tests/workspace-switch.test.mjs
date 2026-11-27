import assert from "node:assert/strict";
import test from "node:test";

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
const { activeWorkspaceId, finishApplyingWorkspace, setLoadedWorkspace } =
    await import("../dist/renderer/workspaces/workspace-store.js");

/** Shows the source workspace, as after loading it. */
function startInSource() {
    setLoadedWorkspace({
        catalog: catalog(SOURCE_ID),
        needsReplan: false,
        revision: 1,
        workspaceId: SOURCE_ID,
    });
    finishApplyingWorkspace(SOURCE_ID);
}

test("switching flushes, isolates planner runs, and applies the destination", async () => {
    const RESTORE = installDialogDocument();
    startInSource();
    const { CALLS, DEPS, STATE } = switchDeps();
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), true);
    } finally {
        RESTORE();
    }
    assert.deepEqual(CALLS.slice(0, 7), [
        "flush",
        "invalidate",
        `load:${TARGET_ID}`,
        "invalidate",
        "reset",
        "apply:ready=false",
        "invalidate",
    ]);
    assert.equal(STATE.ready, true);
    assert.equal(activeWorkspaceId(), TARGET_ID);
});

async function replanAfterSwitch(loadOptions) {
    const RESTORE = installDialogDocument();
    startInSource();
    const { CALLS, DEPS } = switchDeps({
        load: workspaceLoad(TARGET_ID, loadOptions),
    });
    try {
        await switchWorkspace(DEPS, TARGET_ID);
    } finally {
        RESTORE();
    }
    return CALLS.includes("replan");
}

const PLANNED_TODAY = { created_at: new Date().toISOString(), schedule: [] };

test("switching reuses a schedule planned today", async () => {
    assert.equal(await replanAfterSwitch({ lastResult: PLANNED_TODAY }), false);
});

test("switching replans a workspace whose books moved", async () => {
    assert.equal(
        await replanAfterSwitch({
            lastResult: PLANNED_TODAY,
            needsReplan: true,
        }),
        true,
    );
});

test("switching plans a workspace without a schedule", async () => {
    assert.equal(await replanAfterSwitch({}), true);
});

test("switching stays put when the current workspace cannot be saved", async () => {
    const RESTORE = installDialogDocument();
    startInSource();
    const { CALLS, DEPS, STATE } = switchDeps({ flushResult: false });
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), false);
    } finally {
        RESTORE();
    }
    assert.equal(
        CALLS.some((call) => call.startsWith("load")),
        false,
    );
    assert.equal(STATE.ready, true);
    assert.equal(activeWorkspaceId(), SOURCE_ID);
});

test("switching is refused while a dialog holds unsaved edits", async () => {
    const RESTORE = installDialogDocument(true);
    startInSource();
    const { CALLS, DEPS } = switchDeps();
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), false);
    } finally {
        RESTORE();
    }
    assert.equal(CALLS.includes("flush"), false);
    assert.match(CALLS.at(-1), /^status:true:Save or close/u);
});

test("a failed activation re-enables autosave and reports the error", async () => {
    const RESTORE = installDialogDocument();
    startInSource();
    const { CALLS, DEPS, STATE } = switchDeps({
        deps: {
            api: {
                load: () =>
                    Promise.reject(
                        "Workspace workspace-target does not exist.",
                    ),
            },
        },
    });
    try {
        assert.equal(await switchWorkspace(DEPS, TARGET_ID), false);
    } finally {
        RESTORE();
    }
    assert.equal(STATE.ready, true);
    assert.match(CALLS.at(-1), /does not exist/u);
    assert.equal(activeWorkspaceId(), SOURCE_ID);
});

test("switching to the active workspace does nothing", async () => {
    startInSource();
    const { CALLS, DEPS } = switchDeps();
    assert.equal(await switchWorkspace(DEPS, SOURCE_ID), true);
    assert.deepEqual(CALLS, []);
});
