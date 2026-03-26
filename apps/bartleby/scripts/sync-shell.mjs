import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "..");
const REPO_ROOT = path.resolve(APP_ROOT, "..", "..");
const FRONTEND_RENDERER_SCRIPT =
    '    <script type="module" src="renderer/app.js"></script>';
const FRONTEND_IMPORT_MAP_PATTERN =
    / {4}<script type="importmap">[\s\S]*? {4}<\/script>\n/g;
const FRONTEND_SHELL_PATH = path.join(
    REPO_ROOT,
    "packages",
    "frontend",
    "index.html",
);
const APP_SHELL_PATH = path.join(APP_ROOT, "index.html");
const STYLESHEET_LINE = '    <link rel="stylesheet" href="styles.css" />';
const APP_ENTRY_LINE = '    <script type="module" src="/src/main.ts"></script>';

function readFrontendShell() {
    return fs.readFileSync(FRONTEND_SHELL_PATH, "utf8");
}

function assertShellShape(shellHtml) {
    if (!shellHtml.includes(STYLESHEET_LINE)) {
        throw new Error(
            "packages/frontend/index.html no longer exposes the expected stylesheet line.",
        );
    }
}

function buildAppShell(shellHtml) {
    assertShellShape(shellHtml);
    const SHELL_WITH_ENTRY = shellHtml.replace(STYLESHEET_LINE, APP_ENTRY_LINE);
    const SHELL_WITHOUT_IMPORT_MAP = SHELL_WITH_ENTRY.replace(
        FRONTEND_IMPORT_MAP_PATTERN,
        "",
    );
    return SHELL_WITHOUT_IMPORT_MAP.replace(FRONTEND_RENDERER_SCRIPT, "");
}

function writeAppShell(appShellHtml) {
    fs.writeFileSync(APP_SHELL_PATH, appShellHtml, "utf8");
}

writeAppShell(buildAppShell(readFrontendShell()));
