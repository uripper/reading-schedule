/** Verifies that saves carry the loaded workspace and revision, and stale saves fail visibly. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    createWorkspaceApi,
    rememberLoadedWorkspace,
    saveWorkspaceState,
} from "../src/runtime/tauri-workspace-api.ts";

const CAREER_ID = "workspace-career";
const FRENCH_ID = "workspace-french";
const LOADED_REVISION = 4;
const SAVED_REVISION = 5;

function catalog(activeId) {
    return {
        activeWorkspaceId: activeId,
        workspaces: [CAREER_ID, FRENCH_ID].map((id) => ({
            archived: false,
            bookCount: 0,
            createdAt: "2026-01-01T00:00:00Z",
            id,
            name: id,
            revision: LOADED_REVISION,
        })),
    };
}

function meta(workspaceId, revision) {
    return {
        catalog: catalog(workspaceId),
        needsReplan: false,
        revision,
        workspaceId,
    };
}

test("saves go to the workspace named on the data, with its last known revision", async () => {
    rememberLoadedWorkspace(meta(CAREER_ID, LOADED_REVISION));
    const CALLS = [];
    const INVOKE = (command, args) => {
        CALLS.push({ args, command });
        return Promise.resolve({
            ok: true,
            revision: SAVED_REVISION,
            workspaceId: CAREER_ID,
        });
    };
    const CAREER_DATA = { books: [], workspace_id: CAREER_ID };
    assert.deepEqual(await saveWorkspaceState(INVOKE, CAREER_DATA), {
        ok: true,
        warningMessage: undefined,
    });
    await saveWorkspaceState(INVOKE, CAREER_DATA);
    assert.equal(CALLS[0].command, "state_save");
    assert.equal(CALLS[0].args.request.workspaceId, CAREER_ID);
    assert.equal(CALLS[0].args.request.expectedRevision, LOADED_REVISION);
    assert.equal(CALLS[1].args.request.expectedRevision, SAVED_REVISION);
});

test("native rejections become recoverable save failures with the native message", async () => {
    rememberLoadedWorkspace(meta(CAREER_ID, LOADED_REVISION));
    const REJECT = () =>
        Promise.reject(
            "STALE_WORKSPACE_REVISION: Reload the workspace before saving again.",
        );
    const RESULT = await saveWorkspaceState(REJECT, { books: [] });
    assert.equal(RESULT.ok, false);
    assert.match(RESULT.error, /STALE_WORKSPACE_REVISION/u);
});

test("loading another workspace never redirects data that belongs to the first", async () => {
    rememberLoadedWorkspace(meta(CAREER_ID, LOADED_REVISION));
    const SAVES = [];
    const INVOKE = (command, args) => {
        if (command === "workspace_load") {
            return Promise.resolve({
                ...meta(args.workspaceId, 1),
                state: { books: [] },
            });
        }
        SAVES.push(args.request);
        return Promise.resolve({
            ok: true,
            revision: SAVED_REVISION,
            workspaceId: args.request.workspaceId,
        });
    };
    const API = createWorkspaceApi(INVOKE);
    await API.load(FRENCH_ID);
    await saveWorkspaceState(INVOKE, { books: [], workspace_id: CAREER_ID });
    await saveWorkspaceState(INVOKE, { books: [], workspace_id: FRENCH_ID });
    assert.equal(SAVES[0].workspaceId, CAREER_ID);
    assert.equal(SAVES[0].expectedRevision, LOADED_REVISION);
    assert.equal(SAVES[1].workspaceId, FRENCH_ID);
    assert.equal(SAVES[1].expectedRevision, 1);
});

test("malformed host catalogs are rejected at the boundary", async () => {
    const API = createWorkspaceApi(() =>
        Promise.resolve({ activeWorkspaceId: "", workspaces: [] }),
    );
    await assert.rejects(API.list());
});
