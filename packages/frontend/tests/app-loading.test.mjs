import assert from "node:assert/strict";
import test from "node:test";

const { finishAppStartLoading, withAppLoading } =
    await import("../dist/renderer/app/app-loading.js");

function fakeDocument() {
    const NODES = {
        appLoadingOverlay: { hidden: false },
        appLoadingText: { textContent: "" },
        mainContent: {
            attributes: {},
            setAttribute(name, value) {
                this.attributes[name] = value;
            },
        },
    };
    globalThis.document = { getElementById: (id) => NODES[id] ?? null };
    return NODES;
}

function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const SLOW_TASK_MS = 220;

test("the start overlay hides once the first workspace is shown", () => {
    const NODES = fakeDocument();
    finishAppStartLoading();
    assert.equal(NODES.appLoadingOverlay.hidden, true);
    assert.equal(NODES.mainContent.attributes["aria-busy"], "false");
});

test("quick operations never flash the overlay", async () => {
    const NODES = fakeDocument();
    finishAppStartLoading();
    await withAppLoading("Opening French…", () => Promise.resolve());
    assert.equal(NODES.appLoadingOverlay.hidden, true);
    assert.equal(NODES.appLoadingText.textContent, "Opening French…");
});

test("slow operations show the overlay until the last one finishes", async () => {
    const NODES = fakeDocument();
    let visibleDuringTask = false;
    await withAppLoading("Opening French…", async () => {
        await withAppLoading("Moving books…", async () => {
            await wait(SLOW_TASK_MS);
            visibleDuringTask = !NODES.appLoadingOverlay.hidden;
        });
    });
    assert.equal(visibleDuringTask, true);
    assert.equal(NODES.appLoadingOverlay.hidden, true);
});

test("a failing operation still hides the overlay", async () => {
    const NODES = fakeDocument();
    await assert.rejects(
        withAppLoading("Opening French…", () =>
            Promise.reject(new Error("boom")),
        ),
    );
    assert.equal(NODES.appLoadingOverlay.hidden, true);
});
