import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    backupTargets,
    readStateFromInput,
    writeRecoveredState,
} from "./state_recover_store.mjs";

const APP_NAME = "reading-plan-gui";

/**
 * Parses CLI arguments for state recovery.
 * @param {string[]} argv CLI arguments excluding `node` and script path.
 * @returns {{ inputPath: string, userDataDir: string | null, force: boolean }} Parsed arguments.
 */
function parseArgs(argv) {
    let inputPath = "";
    let userDataDir = null;
    let force = false;
    for (let index = 0; index < argv.length; index += 1) {
        const value = String(argv[index] || "");
        if (value === "--input") {
            inputPath = String(argv[index + 1] || "");
            index += 1;
            continue;
        }
        if (value === "--user-data-dir") {
            userDataDir = String(argv[index + 1] || "");
            index += 1;
            continue;
        }
        if (value === "--force") {
            force = true;
            continue;
        }
        throw new TypeError(`Unknown argument: ${value}`);
    }
    if (!inputPath) {
        throw new TypeError(
            "Missing required argument: --input <path-to-json-or-sqlite>",
        );
    }
    return { force, inputPath, userDataDir };
}

/**
 * Resolves default Electron-like user data path for this app.
 * @returns {string} Absolute default user-data directory.
 */
function defaultUserDataDir() {
    const home = os.homedir();
    if (process.platform === "win32") {
        let base = process.env.APPDATA || "";
        if (!base) {
            base = path.join(home, "AppData", "Roaming");
        }
        return path.join(base, APP_NAME);
    }
    if (process.platform === "darwin") {
        return path.join(home, "Library", "Application Support", APP_NAME);
    }
    let base = process.env.XDG_CONFIG_HOME || "";
    if (!base) {
        base = path.join(home, ".config");
    }
    return path.join(base, APP_NAME);
}

/**
 * Counts top-level persisted entities for summary output.
 * @param {Record<string, unknown>} state Recovered planner state payload.
 * @returns {{ books: number, sessions: number, scheduleRows: number, scheduleCompletions: number }} Count summary.
 */
function countEntities(state) {
    let books = 0;
    if (Array.isArray(state.books)) {
        books = state.books.length;
    }
    let sessions = 0;
    if (Array.isArray(state.sessions)) {
        sessions = state.sessions.length;
    }
    let scheduleRows = 0;
    const lastResult = state.last_result;
    if (
        lastResult &&
        typeof lastResult === "object" &&
        Array.isArray(lastResult.schedule)
    ) {
        scheduleRows = lastResult.schedule.length;
    }
    let scheduleCompletions = 0;
    const completions = state.schedule_completions;
    if (
        completions &&
        typeof completions === "object" &&
        !Array.isArray(completions)
    ) {
        scheduleCompletions = Object.keys(completions).length;
    }
    return { books, scheduleCompletions, scheduleRows, sessions };
}

/**
 * Recovers state from source input and writes it to canonical userData targets.
 * @param {string[]} argv CLI arguments excluding `node` and script path.
 * @returns {{ sourceType: string, inputPath: string, userDataDir: string, backups: string[], counts: Record<string, number> }} Recovery summary.
 */
export function recoverStateFromArgs(argv) {
    const args = parseArgs(argv);
    const inputPath = path.resolve(args.inputPath);
    if (!fs.existsSync(inputPath)) {
        throw new TypeError(`Input file not found: ${inputPath}`);
    }
    const userDataDir = path.resolve(args.userDataDir || defaultUserDataDir());
    const stamp = new Date().toISOString().replace(/[^0-9]/g, "");
    const backups = backupTargets(userDataDir, stamp);
    if (args.force !== true && backups.length > 0) {
        throw new TypeError(
            "Refusing to overwrite existing state without --force.",
        );
    }
    const recovered = readStateFromInput(inputPath);
    writeRecoveredState(userDataDir, recovered.state);
    return {
        backups,
        counts: countEntities(recovered.state),
        inputPath,
        sourceType: recovered.sourceType,
        userDataDir,
    };
}
