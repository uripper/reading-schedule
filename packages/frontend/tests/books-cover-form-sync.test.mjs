/** Verifies that late covers update only the still-matching open book form. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    applyCompletedCoverToForm,
    registerCoverForm,
} from "../dist/renderer/books/cover-form-sync.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";

function formRefs() {
    return {
        bookId: { value: "draft" },
        coverLocal: { value: "" },
        coverPreview: { classList: { toggle: () => undefined }, src: "" },
        coverUrl: { value: "" },
        dialog: { open: true },
    };
}

test("completion updates an open pending-cover edit form so a later save keeps the asset", () => {
    const REFS = formRefs();
    registerCoverForm(REFS);
    const EXPECTED = normalizeBook({ book_id: "draft" });
    const COMPLETED = {
        ...EXPECTED,
        cover_local_path: "/covers/completed.jpg",
    };
    applyCompletedCoverToForm(EXPECTED, COMPLETED);
    assert.equal(REFS.coverLocal.value, COMPLETED.cover_local_path);
    assert.equal(REFS.coverPreview.src, COMPLETED.cover_local_path);
});

test("completion leaves a newer selection and another dialog book untouched", () => {
    const REFS = formRefs();
    registerCoverForm(REFS);
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
