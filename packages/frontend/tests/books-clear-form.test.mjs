// biome-ignore-all lint/correctness/noUnresolvedImports: tests use built frontend artifacts.
/** Retains optional-date reset regression coverage separately from submit flows. */
import assert from "node:assert/strict";
import test from "node:test";
import { clearForm } from "../dist/renderer/books/form-state.js";
import {
    createRefs,
    fakeFormElement,
    fakeInput,
} from "./helpers/books-dialog-submit.mjs";

const CreateClassList = () => ({
    toggle() {
        return undefined;
    },
});

function createClearFormRefs(form, overrides = {}) {
    return {
        ...createRefs(form, overrides),
        afterBookInput: fakeInput("previous-link"),
        coverPreview: { classList: CreateClassList(), src: "" },
        coverUploadInput: fakeInput("selected-file"),
        finishedAtField: { hidden: false },
    };
}

test("clearForm clears optional date inputs instead of preserving stale values", () => {
    const FORM = new fakeFormElement();
    const DEADLINE_INPUT = fakeInput("2026-03-23");
    const FINISHED_AT_INPUT = fakeInput("2026-03-23");
    let clearResultsCalls = 0;

    clearForm(
        createClearFormRefs(FORM, {
            deadlineInput: DEADLINE_INPUT,
            finishedAtInput: FINISHED_AT_INPUT,
        }),
        {
            clearResults() {
                clearResultsCalls += 1;
            },
        },
    );

    assert.equal(DEADLINE_INPUT.value, "");
    assert.equal(DEADLINE_INPUT.defaultValue, "");
    assert.equal(FINISHED_AT_INPUT.value, "");
    assert.equal(clearResultsCalls, 1);
});
