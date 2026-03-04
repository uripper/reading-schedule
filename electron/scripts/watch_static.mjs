/**
 * @file Watch static assets (styles, templates) and rebuild distribution.
 * Monitors for changes and triggers copy_static.mjs on modifications.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logInfo } from "./logger.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const WATCH_PATHS = [
    path.join(ROOT, "styles"),
    path.join(ROOT, "assets"),
    path.join(ROOT, "index.html"),
];

/**
 * Triggers static file copy operation.
 */
function copyStatic() {
    spawn("node", [path.join(SCRIPT_DIR, "copy_static.mjs")], {
        cwd: ROOT,
        stdio: "inherit",
    });
}

/**
 * Sets up watchers on all static paths.
 */
function setupWatchers() {
    logInfo("Watching static assets for changes...");
    for (const WATCH_PATH of WATCH_PATHS) {
        fs.watch(WATCH_PATH, { recursive: true }, (eventType) => {
            if (eventType === "change" || eventType === "rename") {
                logInfo(`${WATCH_PATH} changed, copying static files...`);
                copyStatic();
            }
        });
    }
}

setupWatchers();
