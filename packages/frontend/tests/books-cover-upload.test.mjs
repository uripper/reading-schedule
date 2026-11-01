// biome-ignore-all lint/correctness/noUnresolvedImports: tests import built shared frontend artifacts.
/** Verifies large uploads stay out of saved state until native processing finishes. */
import assert from "node:assert/strict";
import test from "node:test";
import { nextBooksAfterDialogSave } from "../dist/renderer/books/controller-save.js";
import { BookCoverJobs } from "../dist/renderer/books/cover-jobs.js";
import { bindCoverUpload } from "../dist/renderer/books/cover-upload.js";
import {
    releaseCoverUpload,
    stageCoverUpload,
    stagedCoverUpload,
} from "../dist/renderer/books/cover-upload-staging.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";

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
    const STATE = { books: nextBooksAfterDialogSave([], { book: DRAFT }) };
    const JOBS = new BookCoverJobs(
        () => STATE.books,
        (completed) => {
            STATE.books = [completed];
        },
    );
    return { draft: DRAFT, jobs: JOBS, source: SOURCE, state: STATE };
}

test("large upload saves a placeholder before file reading or native normalization completes", async (context) => {
    const RUNTIME = uploadRuntime(context);
    const UPLOAD = largeUpload(context);
    assert.equal(structuredClone(UPLOAD.state.books)[0].cover_local_path, "");
    assert.equal(RUNTIME.calls, 0);
    assert.equal(RUNTIME.readers.length, 0);
    const WORK = UPLOAD.jobs.queue(UPLOAD.draft);
    releaseCoverUpload(UPLOAD.source);
    assert.equal(RUNTIME.readers[0].file.size, LARGE_UPLOAD_BYTES);
    RUNTIME.readers[0].result = "data:image/png;base64,fixture";
    RUNTIME.readers[0].onload();
    await Promise.resolve();
    assert.equal(UPLOAD.state.books[0].cover_local_path, "");
    RUNTIME.pending.resolve("/covers/normalized.jpg");
    await WORK;
    assert.equal(RUNTIME.calls, 1);
    assert.equal(
        UPLOAD.state.books[0].cover_local_path,
        "/covers/normalized.jpg",
    );
});

test("completion updates an open pending-cover edit form so a later save keeps the asset", async () => {
    const { applyCompletedCoverToForm } = await import(
        "../dist/renderer/books/cover-form-sync.js"
    );
    const REFS = uploadRefs(null);
    REFS.dialog.open = true;
    bindCoverUpload(REFS);
    const EXPECTED = normalizeBook({ book_id: "draft" });
    const COMPLETED = {
        ...EXPECTED,
        cover_local_path: "/covers/completed.jpg",
    };
    applyCompletedCoverToForm(EXPECTED, COMPLETED);
    assert.equal(REFS.coverLocal.value, COMPLETED.cover_local_path);
    assert.equal(REFS.coverPreview.src, COMPLETED.cover_local_path);
});

test("completion leaves a newer selection and another dialog book untouched", async () => {
    const { applyCompletedCoverToForm } = await import(
        "../dist/renderer/books/cover-form-sync.js"
    );
    const REFS = uploadRefs(null);
    REFS.dialog.open = true;
    bindCoverUpload(REFS);
    const EXPECTED = normalizeBook({ book_id: "draft" });
    const COMPLETED = { ...EXPECTED, cover_local_path: "/covers/old.jpg" };
    REFS.coverLocal.value = "/covers/new.jpg";
    applyCompletedCoverToForm(EXPECTED, COMPLETED);
    assert.equal(REFS.coverLocal.value, "/covers/new.jpg");
    REFS.coverLocal.value = "";
    REFS.bookId.value = "other";
    applyCompletedCoverToForm(EXPECTED, COMPLETED);
    assert.equal(REFS.coverLocal.value, "");
});
