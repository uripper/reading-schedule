import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const FRONTEND_ROOT = path.resolve(ROOT, "..", "packages", "frontend");
const DIST = path.join(ROOT, "dist");
const STATIC_TARGETS = ["index.html", "styles.css", "styles"];
const ASSETS_SOURCE = path.join(FRONTEND_ROOT, "public", "assets");
const ASSETS_DESTINATION = path.join(DIST, "assets");

function copyStaticTarget(target) {
    const SRC = path.join(FRONTEND_ROOT, target);
    const DEST = path.join(DIST, target);
    fs.cpSync(SRC, DEST, { force: true, recursive: true });
}

fs.mkdirSync(DIST, { recursive: true });
for (const TARGET of STATIC_TARGETS) {
    copyStaticTarget(TARGET);
}
fs.cpSync(ASSETS_SOURCE, ASSETS_DESTINATION, { force: true, recursive: true });
