// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers the review's bulk controls and dismissal without importing unchecked rows. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { syncReviewEntries } from "../dist/renderer/sync/model.js";
import { showSyncReview } from "../dist/renderer/sync/review-dialog.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const SAFE = {
    dateLastRead: "2026-02-02T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "safe",
    title: "Safe",
};
const DECREASE = { ...SAFE, sourceId: "lower", title: "Lower" };
const BOOKS = [
    normalizeBook({ book_id: "safe", title: "Safe" }),
    normalizeBook({ book_id: "lower", progress_percent: 80, title: "Lower" }),
];

function fakeOption(label, value) {
    const OPTION = document.createElement("option");
    OPTION.textContent = label;
    OPTION.value = value;
    return OPTION;
}

/** Adds the dialog lifecycle that the shared fake DOM does not model. */
function withDialogLifecycle(dom) {
    const DOCUMENT = dom.document;
    const CREATE = DOCUMENT.createElement.bind(DOCUMENT);
    DOCUMENT.createElement = (tagName) => {
        const NODE = CREATE(tagName);
        NODE.showModal = () => {
            NODE.open = true;
        };
        NODE.close = () => {
            NODE.open = false;
            NODE.dispatch("close");
        };
        NODE.remove = () => {
            const PARENT = NODE.parentElement;
            PARENT.children = PARENT.children.filter((child) => child !== NODE);
            NODE.parentElement = null;
        };
        return NODE;
    };
}

function setup(t) {
    const DOM = installFakeDom();
    withDialogLifecycle(DOM);
    const PREVIOUS = globalThis.Option;
    globalThis.Option = fakeOption;
    t.after(() => {
        globalThis.Option = PREVIOUS;
        DOM.restore();
    });
    const APPLIED = [];
    showSyncReview({
        addBook: async () => await Promise.resolve(null),
        apply: async (choices) => {
            APPLIED.push(choices);
            return await Promise.resolve("Synced.");
        },
        books: BOOKS,
        entries: syncReviewEntries([SAFE, DECREASE], BOOKS),
        ignore: async () => await Promise.resolve(false),
        invalidRows: 0,
        sourceLabel: "Test reader",
    });
    return { applied: APPLIED, dialog: document.body.children[0] };
}

function button(dialog, label) {
    return dialog
        .querySelectorAll("button")
        .find((node) => node.textContent === label);
}

function labels(dialog) {
    return dialog
        .querySelectorAll(".sync-actions")[0]
        .children.map((node) => node.textContent);
}

test("the review offers only selection controls and Update selected", (t) => {
    const { dialog: DIALOG } = setup(t);
    assert.deepEqual(labels(DIALOG), [
        "Select all",
        "Deselect all",
        "Update selected",
    ]);
    assert.equal(button(DIALOG, "Update all"), undefined);
    assert.equal(button(DIALOG, "Not now"), undefined);
});

test("Select all then Update selected imports only eligible rows", async (t) => {
    const { applied: APPLIED, dialog: DIALOG } = setup(t);
    button(DIALOG, "Deselect all").click();
    button(DIALOG, "Select all").click();
    button(DIALOG, "Update selected").click();
    await new Promise((resolve) => {
        setImmediate(resolve);
    });
    assert.equal(APPLIED.length, 1);
    assert.deepEqual(
        APPLIED[0].map((choice) => choice.record.sourceId),
        ["safe"],
    );
    assert.equal(DIALOG.open, false);
});

test("the review names its source instead of a fixed provider", (t) => {
    const { dialog: DIALOG } = setup(t);
    const TEXT = DIALOG.querySelectorAll("h2")[0].textContent;
    assert.equal(TEXT, "Update progress from Test reader?");
    assert.equal(
        button(DIALOG, "X").attributes.get("aria-label"),
        "Close Test reader sync",
    );
    assert.equal(
        DIALOG.querySelectorAll("p").some((node) =>
            /Kobo/.test(node.textContent),
        ),
        true,
    );
});

test("the shared X dismisses the review without importing", (t) => {
    const { applied: APPLIED, dialog: DIALOG } = setup(t);
    button(DIALOG, "X").click();
    assert.equal(APPLIED.length, 0);
    assert.equal(DIALOG.open, false);
    assert.equal(document.body.children.length, 0);
});

test("Escape is blocked only while a reviewed batch is saving", (t) => {
    const { dialog: DIALOG } = setup(t);
    assert.equal(DIALOG.dispatch("cancel").defaultPrevented, false);
    DIALOG.dataset.busy = "true";
    assert.equal(DIALOG.dispatch("cancel").defaultPrevented, true);
});
