/** Presents the demo's reset, download, and browser-only feature boundaries. */

import type { DemoStorage } from "./storage.ts";

/** Adds accessible host controls and reports storage/reset failures in place. */
export function mountDemoControls(storage: DemoStorage): void {
    const BAR = globalThis.document.createElement("aside");
    BAR.className = "demo-bar";
    BAR.setAttribute("aria-label", "Browser demo controls");
    BAR.innerHTML =
        '<a href="./index.html">Bartleby</a><p>Live demo · Your changes will only be in this browser and may be lost on reload.</p><a href="./index.html#download">Download the app</a><span>Covers from <a href="https://www.penguinrandomhouse.com/">Penguin</a></span><button type="button" class="btn" id="demoReset">Reset demo</button><p id="demoNotice" role="status"></p>';
    BAR.querySelector("#demoReset")?.addEventListener("click", () => {
        resetDemo(storage);
    });
    globalThis.document.body.prepend(BAR);
    const LOAD = storage.load();
    if (LOAD.warningMessage) {
        showDemoNotice(LOAD.warningMessage);
    }
}

/** Freezes pending saves before reloading with fresh, current-date sample data. */
function resetDemo(storage: DemoStorage): void {
    try {
        storage.reset();
        globalThis.location.reload();
    } catch (error) {
        let message = "Unable to reset. Allow browser storage and try again.";
        if (error instanceof Error) {
            message = `${message} ${error.message}`;
        }
        showDemoNotice(message);
    }
}

/** Reports startup and reset failures without hiding the recovery controls. */
export function showDemoNotice(message: string): void {
    const NOTICE = globalThis.document.getElementById("demoNotice");
    if (NOTICE) {
        NOTICE.textContent = message;
    }
}
