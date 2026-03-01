import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.join(SCRIPT_DIR, ".."));
const DIST = path.join(ROOT, "dist");

const targets = ["index.html", "styles.css", "styles", "assets"];

fs.mkdirSync(DIST, { recursive: true });
for (const target of targets) {
    const src = path.join(ROOT, target);
    const dest = path.join(DIST, target);
    fs.cpSync(src, dest, { force: true, recursive: true });
}
