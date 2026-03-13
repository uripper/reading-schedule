/**
 * Installs repository git hooks using a cross-platform Node entrypoint.
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const GIT_HOOKS_PATH = ".githooks";
const PRE_PUSH_HOOK_PATH = `${GIT_HOOKS_PATH}/pre-push`;
const GIT_SUCCESS_EXIT_CODE = 0;

/**
 * Runs git with inherited environment and captured output.
 * @param {string[]} args - Git CLI arguments.
 * @returns {import("node:child_process").SpawnSyncReturns<Buffer>} Git result.
 */
function runGit(args) {
    return spawnSync("git", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    });
}

/**
 * Checks whether the current working directory is inside a git work tree.
 * @returns {boolean} True when git reports a work tree.
 */
function isInsideGitWorkTree() {
    const RESULT = runGit(["rev-parse", "--is-inside-work-tree"]);
    if (RESULT.status !== GIT_SUCCESS_EXIT_CODE) {
        return false;
    }
    return RESULT.stdout.trim() === "true";
}

/**
 * Configures git to use the repository hook directory.
 * @returns {boolean} True when git config succeeds.
 */
function installHooksPath() {
    const RESULT = runGit(["config", "core.hooksPath", GIT_HOOKS_PATH]);
    if (RESULT.status === GIT_SUCCESS_EXIT_CODE) {
        return true;
    }
    const STDERR_TEXT = String(RESULT.stderr ?? "").trim();
    process.stdout.write(
        `[hooks] Skipping hook installation: ${
            STDERR_TEXT || "git config core.hooksPath failed"
        }\n`,
    );
    return false;
}

/**
 * Marks the pre-push hook executable when the platform supports it.
 */
function ensureHookExecutable() {
    if (process.platform === "win32") {
        return;
    }
    fs.chmodSync(PRE_PUSH_HOOK_PATH, 0o755);
}

if (!isInsideGitWorkTree()) {
    process.stdout.write(
        "[hooks] Not in a git work tree; skipping hook installation.\n",
    );
    process.exit(GIT_SUCCESS_EXIT_CODE);
}

if (!fs.existsSync(PRE_PUSH_HOOK_PATH)) {
    process.stdout.write(
        `[hooks] Missing ${PRE_PUSH_HOOK_PATH}; skipping hook installation.\n`,
    );
    process.exit(GIT_SUCCESS_EXIT_CODE);
}

if (!installHooksPath()) {
    process.exit(GIT_SUCCESS_EXIT_CODE);
}
ensureHookExecutable();
process.stdout.write(`[hooks] Installed git hooks from ${GIT_HOOKS_PATH}.\n`);
process.stdout.write("[hooks] pre-push will run: pnpm run ci:local\n");
