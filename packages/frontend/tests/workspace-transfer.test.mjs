import assert from "node:assert/strict";
import test from "node:test";

import {
    SOURCE_ID,
    TARGET_ID,
    catalog,
    installDialogDocument,
    switchDeps,
} from "./helpers/workspaces.mjs";

const { conflictPartnerId, withLinkedBooks } =
    await import("../dist/renderer/workspaces/workspace-transfer-conflicts.js");
const { moveBooksToWorkspace } =
    await import("../dist/renderer/workspaces/workspace-transfer.js");
const { setWorkspaceCatalog } =
    await import("../dist/renderer/workspaces/workspace-store.js");

const OUTGOING = {
    blockedById: "book-prequel",
    bookId: "book-sequel",
    direction: "outgoing",
};
const INCOMING = {
    blockedById: "book-sequel",
    bookId: "book-third",
    direction: "incoming",
};

test("the linked partner is the book staying behind", () => {
    assert.equal(conflictPartnerId(OUTGOING), "book-prequel");
    assert.equal(conflictPartnerId(INCOMING), "book-third");
});

test("moving linked books together adds both directions once", () => {
    assert.deepEqual(
        withLinkedBooks(["book-sequel"], [OUTGOING, INCOMING, OUTGOING]),
        ["book-sequel", "book-prequel", "book-third"],
    );
});

test("no books move when the pending save fails", async () => {
    setWorkspaceCatalog(catalog(SOURCE_ID));
    let transfers = 0;
    const { CALLS, DEPS } = switchDeps({
        deps: {
            api: {
                transferBooks: () => {
                    transfers += 1;
                    return Promise.resolve();
                },
            },
        },
        flushResult: false,
    });
    await moveBooksToWorkspace(DEPS, ["book-sequel"], TARGET_ID);
    assert.equal(transfers, 0);
    assert.match(CALLS.at(-1), /^status:true:Save failed/u);
});

test("host errors are reported and leave the library untouched", async () => {
    setWorkspaceCatalog(catalog(SOURCE_ID));
    const { CALLS, DEPS } = switchDeps({
        deps: {
            api: {
                load: () => Promise.reject(new Error("must not reload")),
                transferBooks: () =>
                    Promise.reject(
                        "Book book-sequel already exists in the destination workspace.",
                    ),
            },
        },
    });
    const RESTORE = installDialogDocument();
    try {
        await moveBooksToWorkspace(DEPS, ["book-sequel"], TARGET_ID);
    } finally {
        RESTORE();
    }
    assert.match(
        CALLS.at(-1),
        /^status:true:Books were not moved: Book book-sequel already exists/u,
    );
});
