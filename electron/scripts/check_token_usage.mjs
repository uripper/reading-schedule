import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const _FILENAME = fileURLToPath(import.meta.url);
const _DIRNAME = path.dirname(_FILENAME);
const ELECTRON_ROOT = path.resolve(_DIRNAME, "..");
const STYLES_ROOT = path.join(ELECTRON_ROOT, "styles");
const IGNORE_FILES = new Set([
    path.join(STYLES_ROOT, "generated", "tokens.css"),
]);
const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;

/**
 * Recursively collects CSS files under a directory.
 * @param {string} dir Directory to traverse.
 * @param {string[]} files Accumulator for discovered CSS file paths.
 * @returns {string[]} Discovered CSS file paths.
 */
function walkCssFiles(dir, files = []) {
    for (const ENTRY of fs.readdirSync(dir, { withFileTypes: true })) {
        const FULL_PATH = path.join(dir, ENTRY.name);
        if (ENTRY.isDirectory()) {
            walkCssFiles(FULL_PATH, files);
            continue;
        }
        if (ENTRY.isFile() && ENTRY.name.endsWith(".css")) {
            files.push(FULL_PATH);
        }
    }
    return files;
}

let failures = 0;
for (const FILE_PATH of walkCssFiles(STYLES_ROOT)) {
    if (IGNORE_FILES.has(FILE_PATH)) {
        continue;
    }
    const SOURCE = fs.readFileSync(FILE_PATH, "utf8");
    const LINES = SOURCE.split(/\r?\n/);
    for (const [INDEX, LINE] of LINES.entries()) {
        const TRIMMED = LINE.trim();
        if (!TRIMMED || TRIMMED.startsWith("/*")) {
            continue;
        }
        const MATCHES = LINE.match(HEX_PATTERN);
        if (!MATCHES) {
            continue;
        }
        failures += 1;
        process.stderr.write(
            `${path.relative(ELECTRON_ROOT, FILE_PATH)}:${INDEX + 1} uses raw hex color ${MATCHES.join(", ")}\n`,
        );
    }
}

if (failures > 0) {
    process.stderr.write(
        `\nFound ${failures} raw hex color usage(s). Use design tokens from tokens/dtcg.tokens.json.\n`,
    );
    process.exit(1);
}

process.stdout.write(
    "Token usage check passed: no raw hex colors found in style sources.\n",
);
