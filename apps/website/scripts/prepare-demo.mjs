/** Builds the shared Rust core and derives the demo shell from the frontend. */
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { prepareDemoToolchain, runTool } from "./demo-toolchain.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const WEBSITE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const PLANNER_ROOT = `${REPO_ROOT}packages/planner`;
const OUTPUT_ROOT = `${PLANNER_ROOT}/dist`;

/** Generates a thin browser host without maintaining a second UI shell. */
function prepareShell() {
    const SOURCE = fs.readFileSync(
        `${REPO_ROOT}packages/frontend/index.html`,
        "utf8",
    );
    const SHELL = SOURCE.replace(
        '<link rel="stylesheet" href="styles.css" />',
        '<script type="module" src="./src/demo/main.ts"></script>',
    )
        .replace(/ {4}<script type="importmap">[\s\S]*? {4}<\/script>\n/g, "")
        .replace(
            '    <script type="module" src="renderer/app.js"></script>',
            "",
        )
        .replace("<title>Bartleby</title>", "<title>Try Bartleby</title>");
    fs.writeFileSync(`${WEBSITE_ROOT}demo.html`, SHELL);
    fs.cpSync(
        `${REPO_ROOT}packages/frontend/public/assets`,
        `${WEBSITE_ROOT}public/assets`,
        { recursive: true },
    );
}

/** Keeps fixture imports local so TypeScript test builds preserve their paths. */
function prepareSampleData() {
    const GENERATED = `${WEBSITE_ROOT}src/demo/generated`;
    fs.mkdirSync(GENERATED, { recursive: true });
    fs.copyFileSync(
        `${REPO_ROOT}data/books.sample.json`,
        `${GENERATED}/books.sample.json`,
    );
    fs.copyFileSync(
        `${REPO_ROOT}data/settings.json`,
        `${GENERATED}/settings.json`,
    );
    fs.writeFileSync(
        `${OUTPUT_ROOT}/package.json`,
        JSON.stringify({ type: "module" }),
    );
}

const TOOL_ENV = await prepareDemoToolchain(PLANNER_ROOT);
runTool(
    "cargo",
    [
        "build",
        "--lib",
        "--locked",
        "--release",
        "--target",
        "wasm32-unknown-unknown",
        "--manifest-path",
        `${PLANNER_ROOT}/Cargo.toml`,
    ],
    TOOL_ENV,
);
runTool(
    "wasm-bindgen",
    [
        "--target",
        "web",
        "--out-dir",
        OUTPUT_ROOT,
        `${PLANNER_ROOT}/target/wasm32-unknown-unknown/release/bartleby_planner.wasm`,
    ],
    TOOL_ENV,
);
prepareShell();
prepareSampleData();
