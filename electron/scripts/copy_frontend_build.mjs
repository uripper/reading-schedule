import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const FRONTEND_DIST = path.resolve(ROOT, "..", "packages", "frontend", "dist");
const DIST = path.join(ROOT, "dist");
const TARGETS = [
    "assets",
    "index.html",
    "renderer",
    "styles",
    "styles.css",
    "types",
];

fs.mkdirSync(DIST, { recursive: true });
for (const TARGET of TARGETS) {
    const SOURCE = path.join(FRONTEND_DIST, TARGET);
    const DESTINATION = path.join(DIST, TARGET);
    fs.cpSync(SOURCE, DESTINATION, { force: true, recursive: true });
}
