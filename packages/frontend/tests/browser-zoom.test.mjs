/** Browser hosts must retain the browser's native keyboard zoom behavior. */

import assert from "node:assert/strict";
import test from "node:test";
import { createZoomShortcutHandler } from "../dist/renderer/shortcuts/desktop-shortcuts-zoom.js";

test("browser hosts leave zoom keys unhandled", () => {
    const HANDLER = createZoomShortcutHandler(
        {
            nativeZoom: false,
            zoomIn: unexpectedZoom,
            zoomOut: unexpectedZoom,
            zoomReset: unexpectedZoom,
        },
        () => {
            throw new Error("No native zoom announcement expected");
        },
    );
    const KEYS = ["+", "=", "-", "_", "0"];
    for (const KEY of KEYS) {
        const EVENT = {
            altKey: false,
            ctrlKey: true,
            key: KEY,
            preventDefault: () => {
                throw new Error("Browser default must remain enabled");
            },
        };
        assert.equal(HANDLER(EVENT), false);
    }
});

/** Fails the regression if a browser shortcut invokes native IPC. */
function unexpectedZoom() {
    throw new Error("Native zoom must not run");
}
