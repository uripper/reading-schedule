/** Fixtures for workspace switching, transfer, and isolation tests. */
export const SOURCE_ID = "workspace-source";
export const TARGET_ID = "workspace-target";

/** Builds a catalog whose active workspace is `activeId`. */
export function catalog(activeId) {
    return {
        activeWorkspaceId: activeId,
        workspaces: [
            summary(SOURCE_ID, "Career"),
            summary(TARGET_ID, "French"),
        ],
    };
}

function summary(id, name) {
    return {
        archived: false,
        bookCount: 1,
        createdAt: "2026-01-01T00:00:00Z",
        id,
        name,
        revision: 1,
    };
}

/** Builds a host workspace load payload. */
export function workspaceLoad(workspaceId, options = {}) {
    return {
        catalog: catalog(workspaceId),
        needsReplan: options.needsReplan ?? false,
        revision: 2,
        state: {
            books: [],
            last_result: options.lastResult ?? null,
            settings: {},
        },
        workspaceId,
    };
}

function fakeContext(calls, state, overrides) {
    return {
        announce: (message) => calls.push(`announce:${message}`),
        flushPendingChanges: () => {
            calls.push("flush");
            return Promise.resolve(overrides.flushResult ?? true);
        },
        setStatus: (message, isError) =>
            calls.push(`status:${Boolean(isError)}:${message}`),
        state,
    };
}

function fakePlanController(calls) {
    return {
        invalidatePendingRuns: () => calls.push("invalidate"),
        queueAutoPlan: () => calls.push("replan"),
    };
}

/** Records switch dependencies calls in order. */
export function switchDeps(overrides = {}) {
    const CALLS = [];
    const STATE = { ready: true };
    const DEPS = {
        api: {
            load: (workspaceId) => {
                CALLS.push(`load:${workspaceId}`);
                return Promise.resolve(
                    overrides.load ?? workspaceLoad(workspaceId),
                );
            },
            select: (workspaceId) => {
                CALLS.push(`select:${workspaceId}`);
                return Promise.resolve();
            },
        },
        applyState: () => {
            CALLS.push(`apply:ready=${STATE.ready}`);
            return Promise.resolve();
        },
        context: fakeContext(CALLS, STATE, overrides),
        planController: fakePlanController(CALLS),
        resetTransientUi: () => CALLS.push("reset"),
        ...overrides.deps,
    };
    return { CALLS, DEPS, STATE };
}

/** Installs the minimal document used by the open-dialog guard. */
export function installDialogDocument(hasOpenDialog = false) {
    const PREVIOUS = globalThis.document;
    globalThis.document = {
        getElementById: () => null,
        querySelector: () => {
            if (hasOpenDialog) {
                return {};
            }
            return null;
        },
    };
    return () => {
        globalThis.document = PREVIOUS;
    };
}
