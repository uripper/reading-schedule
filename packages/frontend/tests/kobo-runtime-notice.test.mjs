// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers manual empty-sync feedback without changing the connection badge. */
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PREFERENCES } from "../dist/renderer/app/experience/model.js";
import { startKoboSync } from "../dist/renderer/kobo/runtime.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const CONTEXT = {
    plannerApi: {
        pickKoboDatabase: async () => await Promise.resolve(null),
        readKoboProgress: async () =>
            await Promise.resolve({
                invalidRows: 0,
                records: [],
                status: "connected",
            }),
    },
    state: {
        preferences: {
            ...DEFAULT_PREFERENCES,
            koboDatabasePath: "/device/.kobo/KoboReader.sqlite",
            koboSyncEnabled: true,
        },
    },
};

/** Models modal opening and cleanup for the native-dialog boundary. */
function installDialogLifecycle(dom) {
    const DOCUMENT = dom.document;
    const CREATE = DOCUMENT.createElement.bind(DOCUMENT);
    DOCUMENT.createElement = (tag) => {
        const NODE = CREATE(tag);
        NODE.showModal = () => {
            NODE.open = true;
        };
        NODE.remove = () => {
            const PARENT = NODE.parentElement;
            PARENT.children = PARENT.children.filter((child) => child !== NODE);
            NODE.parentElement = null;
        };
        NODE.close = () => {
            NODE.open = false;
            NODE.dispatch("close");
        };
        return NODE;
    };
}

async function settle() {
    await new Promise(setImmediate);
}

/** Installs an enabled reader without starting a real polling timer. */
async function setup(t) {
    const DOM = installFakeDom();
    t.after(DOM.restore);
    installDialogLifecycle(DOM);
    t.mock.method(globalThis, "setInterval", () => 0);
    document.body.append(DOM.createElement("div", "syncProviders"));
    startKoboSync(CONTEXT);
    await settle();
}

test("Check now opens an up-to-date popup; background checks keep quiet", async (t) => {
    await setup(t);
    assert.equal(document.querySelector("dialog"), null);
    const STATUS = document.querySelector(".kobo-status");
    assert.equal(STATUS.textContent, "Connected");
    document.body
        .querySelectorAll("button")
        .find((node) => node.textContent === "Check now")
        .click();
    await settle();
    const POPUP = document.querySelector("dialog");
    assert.equal(POPUP.open, true);
    assert.equal(
        POPUP.querySelector("h2").textContent,
        "All books up to date!",
    );
    assert.equal(STATUS.textContent, "Connected");
    POPUP.querySelector("button").click();
    assert.equal(document.querySelector("dialog"), null);
});
