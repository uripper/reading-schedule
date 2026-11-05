/** Verifies clipboard paste in the book dialog stages covers like file upload. */
import assert from "node:assert/strict";
import test from "node:test";
import { bindCoverPaste } from "../dist/renderer/books/cover-paste.js";
import {
    releaseCoverUpload,
    stagedCoverUpload,
} from "../dist/renderer/books/cover-upload-staging.js";

const NO_IMAGE_MESSAGE = "Clipboard has no image to use as a cover.";
const UNSUPPORTED_MESSAGE = "Use a PNG, JPG, or WEBP image.";

function pasteRefs({ disabled = false } = {}) {
    return {
        bookId: { value: "draft" },
        coverLocal: { value: "" },
        coverPreview: {
            classList: {
                toggle() {
                    return undefined;
                },
            },
            src: "",
        },
        coverUploadInput: { disabled },
        coverUrl: { value: "" },
        dialog: new EventTarget(),
        lookupMeta: { dataset: {}, textContent: "" },
    };
}

function clipboardData(file) {
    return {
        files: { item: () => file },
        items: [],
    };
}

function pasteEvent(file, target = null) {
    const EVENT = new Event("paste", { cancelable: true });
    Object.defineProperty(EVENT, "clipboardData", {
        value: clipboardData(file),
    });
    if (target !== null) {
        Object.defineProperty(EVENT, "target", { value: target });
    }
    return EVENT;
}

function bindAndPaste(refs, event) {
    bindCoverPaste(refs);
    refs.dialog.dispatchEvent(event);
    return event;
}

test("pasting an image stages it as the custom cover", (context) => {
    const FILE = new File(["png"], "image.png", { type: "image/png" });
    const REFS = pasteRefs();
    const EVENT = bindAndPaste(REFS, pasteEvent(FILE));
    context.after(() => releaseCoverUpload(REFS.coverLocal.value));
    assert.equal(EVENT.defaultPrevented, true);
    assert.equal(stagedCoverUpload(REFS.coverLocal.value), FILE);
    assert.equal(REFS.coverPreview.src, REFS.coverLocal.value);
});

test("pasting an unsupported image type reports a clear error", () => {
    const FILE = new File(["gif"], "image.gif", { type: "image/gif" });
    const REFS = pasteRefs();
    bindAndPaste(REFS, pasteEvent(FILE));
    assert.equal(REFS.coverLocal.value, "");
    assert.equal(REFS.lookupMeta.textContent, UNSUPPORTED_MESSAGE);
});

test("pasting non-image content outside text fields reports no image", () => {
    const REFS = pasteRefs();
    const EVENT = bindAndPaste(REFS, pasteEvent(null));
    assert.equal(EVENT.defaultPrevented, false);
    assert.equal(REFS.lookupMeta.textContent, NO_IMAGE_MESSAGE);
});

test("pasting text into a form field keeps the default paste", () => {
    const FIELD = { closest: () => FIELD };
    const REFS = pasteRefs();
    const EVENT = bindAndPaste(REFS, pasteEvent(null, FIELD));
    assert.equal(EVENT.defaultPrevented, false);
    assert.equal(REFS.lookupMeta.textContent, "");
});

test("bulk edit ignores pasted images because covers are disabled", () => {
    const FILE = new File(["png"], "image.png", { type: "image/png" });
    const REFS = pasteRefs({ disabled: true });
    const EVENT = bindAndPaste(REFS, pasteEvent(FILE));
    assert.equal(EVENT.defaultPrevented, false);
    assert.equal(REFS.coverLocal.value, "");
});
