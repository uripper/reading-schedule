/** Verifies the native picker contract without opening an operating-system dialog. */
import assert from "node:assert/strict";
import test from "node:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { pickKoboDatabase } from "../src/runtime/tauri-kobo-api.ts";

const DATABASE = "/reader/.kobo/KoboReader.sqlite";

/** Tauri's upstream IPC mock expects a browser window global. */
function mockDialog(t, callback) {
    const PREVIOUS = globalThis.window;
    globalThis.window = {};
    mockIPC(callback);
    t.after(() => {
        clearMocks();
        globalThis.window = PREVIOUS;
    });
}

test("Browse opens a single-file database picker and returns the chosen path", async (t) => {
    const CALLS = [];
    mockDialog(t, (command, args) => {
        CALLS.push({ args, command });
        return DATABASE;
    });
    assert.equal(await pickKoboDatabase(DATABASE), DATABASE);
    assert.equal(CALLS[0].command, "plugin:dialog|open");
    assert.equal(CALLS[0].args.options.multiple, false);
    assert.equal(CALLS[0].args.options.directory, false);
    assert.equal(CALLS[0].args.options.defaultPath, DATABASE);
    assert.ok(CALLS[0].args.options.filters[0].extensions.includes("sqlite"));
});

test("cancelling the system picker returns null", async (t) => {
    mockDialog(t, () => null);
    assert.equal(await pickKoboDatabase(), null);
});
