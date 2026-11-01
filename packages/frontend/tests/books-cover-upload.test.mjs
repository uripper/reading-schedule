// biome-ignore-all lint/correctness/noUnresolvedImports: tests import built shared frontend artifacts.
/** Verifies large uploads stay out of saved state until native processing finishes. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    fillBooks,
    getBookById,
    saveBook,
    setBookCommitHook,
} from "../dist/renderer/books/controller.js";
import { bindCoverUpload } from "../dist/renderer/books/cover-upload.js";
import {
    releaseCoverUpload,
    stageCoverUpload,
    stagedCoverUpload,
} from "../dist/renderer/books/cover-upload-staging.js";
import { bindBookDialogSubmit } from "../dist/renderer/books/dialog_submit.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    createRefs,
    fakeFormElement,
    fakeHtmlElement,
    flushMicrotasks,
} from "./helpers/books-dialog-submit.mjs";

const LARGE_UPLOAD_BYTES = 8 * 1024 * 1024;

function uploadRefs(file) {
    return {
        bookId: { value: "draft" },
        coverLocal: { value: "" },
        coverPanel: new EventTarget(),
        coverPreview: {
            classList: {
                toggle() {
                    return undefined;
                },
            },
            src: "",
        },
        coverUploadInput: Object.assign(new EventTarget(), {
            files: { item: () => file, length: 1 },
            value: "selected",
        }),
        coverUrl: { value: "" },
        dialog: new EventTarget(),
        lookupMeta: { dataset: {}, textContent: "" },
    };
}

test("file selection stages a preview immediately and cancellation releases it", () => {
    const FILE = new File(["test"], "cover.png", { type: "image/png" });
    const REFS = uploadRefs(FILE);
    bindCoverUpload(REFS);
    REFS.coverUploadInput.dispatchEvent(new Event("change"));
    const SOURCE = REFS.coverLocal.value;
    assert.equal(stagedCoverUpload(SOURCE), FILE);
    assert.equal(REFS.coverPreview.src, SOURCE);
    assert.equal(REFS.coverUploadInput.value, "");
    REFS.dialog.dispatchEvent(new Event("close"));
    assert.equal(stagedCoverUpload(SOURCE), undefined);
});

function uploadRuntime(context) {
    const PREVIOUS_API = globalThis.plannerApi;
    const PREVIOUS_READER = globalThis.FileReader;
    const STATE = { calls: 0, pending: Promise.withResolvers(), readers: [] };
    globalThis.FileReader = function uploadReader() {
        return {
            readAsDataURL(file) {
                this.file = file;
                STATE.readers.push(this);
            },
        };
    };
    globalThis.plannerApi = {
        saveUploadedCover: () => {
            STATE.calls += 1;
            return STATE.pending.promise;
        },
    };
    context.after(() => {
        STATE.pending.resolve("/covers/cleanup.jpg");
        globalThis.FileReader = PREVIOUS_READER;
        globalThis.plannerApi = PREVIOUS_API;
    });
    return STATE;
}

function largeUpload(context) {
    const FILE = new File([new Uint8Array(LARGE_UPLOAD_BYTES)], "large.png", {
        type: "image/png",
    });
    const SOURCE = stageCoverUpload(FILE);
    context.after(() => releaseCoverUpload(SOURCE));
    const DRAFT = normalizeBook({
        book_id: "upload",
        cover_local_path: SOURCE,
    });
    return createSaveScenario(context, DRAFT);
}

function installSaveScenario(context) {
    const PREVIOUS = {
        element: globalThis.HTMLElement,
        select: globalThis.HTMLSelectElement,
    };
    globalThis.HTMLElement = fakeHtmlElement;
    globalThis.HTMLSelectElement = fakeHtmlElement;
    fillBooks([]);
    context.after(() => restoreSaveScenario(PREVIOUS));
}

function createSaveScenario(context, draft) {
    installSaveScenario(context);
    const FORM = new fakeFormElement();
    const REFS = createRefs(FORM, {
        bookId: { value: draft.book_id },
        coverLocal: { value: draft.cover_local_path },
    });
    const STATE = {
        closed: false,
        committed: [],
        completed: Promise.withResolvers(),
    };
    setBookCommitHook((books) => recordCommit(STATE, books));
    bindBookDialogSubmit({
        form: FORM,
        onComplete: () => {
            STATE.closed = true;
            releaseCoverUpload(draft.cover_local_path);
        },
        onSubmit: saveBook,
        refs: REFS,
    });
    return { form: FORM, state: STATE };
}

function recordCommit(state, books) {
    state.committed.push(structuredClone(books));
    if (books[0]?.cover_local_path) {
        state.completed.resolve();
    }
}

function restoreSaveScenario(previous) {
    fillBooks([]);
    setBookCommitHook();
    globalThis.HTMLElement = previous.element;
    globalThis.HTMLSelectElement = previous.select;
}

test("dialog save queues a staged upload after committing metadata and applies its completed cover", async (context) => {
    const RUNTIME = uploadRuntime(context);
    const UPLOAD = largeUpload(context);
    UPLOAD.form.submit();
    await flushMicrotasks();
    assert.equal(UPLOAD.state.committed[0][0].cover_local_path, "");
    assert.equal(UPLOAD.state.closed, true);
    assert.equal(RUNTIME.readers[0].file.size, LARGE_UPLOAD_BYTES);
    RUNTIME.readers[0].result = "data:image/png;base64,fixture";
    RUNTIME.readers[0].onload();
    await flushMicrotasks();
    assert.equal(RUNTIME.calls, 1);
    assert.equal(getBookById("upload").cover_local_path, "");
    RUNTIME.pending.resolve("/covers/normalized.jpg");
    await UPLOAD.state.completed.promise;
    assert.equal(
        getBookById("upload").cover_local_path,
        "/covers/normalized.jpg",
    );
});
