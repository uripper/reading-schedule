import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const DIST = path.join(ROOT, "dist");

const TARGETS = ["index.html", "styles.css", "styles", "assets"];

fs.mkdirSync(DIST, { recursive: true });
for (const TARGET of TARGETS) {
    const SRC = path.join(ROOT, TARGET);
    const DEST = path.join(DIST, TARGET);
    fs.cpSync(SRC, DEST, { force: true, recursive: true });
}
