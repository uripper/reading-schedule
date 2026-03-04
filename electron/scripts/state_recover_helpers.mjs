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
        const VALUE = String(argv[index] || "");
        if (VALUE === "--input") {
            inputPath = String(argv[index + 1] || "");
            index += 1;
            continue;
        }
        if (VALUE === "--user-data-dir") {
            userDataDir = String(argv[index + 1] || "");
            index += 1;
            continue;
        }
        if (VALUE === "--force") {
            force = true;
            continue;
        }
        throw new TypeError(`Unknown argument: ${VALUE}`);
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
    const HOME = os.homedir();
    if (process.platform === "win32") {
        let base = process.env.APPDATA || "";
        if (!base) {
            base = path.join(HOME, "AppData", "Roaming");
        }
        return path.join(base, APP_NAME);
    }
    if (process.platform === "darwin") {
        return path.join(HOME, "Library", "Application Support", APP_NAME);
    }
    let base = process.env.XDG_CONFIG_HOME || "";
    if (!base) {
        base = path.join(HOME, ".config");
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
    const LAST_RESULT = state.last_result;
    if (
        LAST_RESULT &&
        typeof LAST_RESULT === "object" &&
        Array.isArray(LAST_RESULT.schedule)
    ) {
        scheduleRows = LAST_RESULT.schedule.length;
    }
    let scheduleCompletions = 0;
    const COMPLETIONS = state.schedule_completions;
    if (
        COMPLETIONS &&
        typeof COMPLETIONS === "object" &&
        !Array.isArray(COMPLETIONS)
    ) {
        scheduleCompletions = Object.keys(COMPLETIONS).length;
    }
    return { books, scheduleCompletions, scheduleRows, sessions };
}

/**
 * Recovers state from source input and writes it to canonical userData targets.
 * @param {string[]} argv CLI arguments excluding `node` and script path.
 * @returns {{ sourceType: string, inputPath: string, userDataDir: string, backups: string[], counts: Record<string, number> }} Recovery summary.
 */
export function recoverStateFromArgs(argv) {
    const ARGS = parseArgs(argv);
    const INPUT_PATH = path.resolve(ARGS.inputPath);
    if (!fs.existsSync(INPUT_PATH)) {
        throw new TypeError(`Input file not found: ${INPUT_PATH}`);
    }
    const USER_DATA_DIR = path.resolve(
        ARGS.userDataDir || defaultUserDataDir(),
    );
    const STAMP = new Date().toISOString().replace(/[^0-9]/g, "");
    const BACKUPS = backupTargets(USER_DATA_DIR, STAMP);
    if (ARGS.force !== true && BACKUPS.length > 0) {
        throw new TypeError(
            "Refusing to overwrite existing state without --force.",
        );
    }
    const RECOVERED = readStateFromInput(INPUT_PATH);
    writeRecoveredState(USER_DATA_DIR, RECOVERED.state);
    return {
        backups: BACKUPS,
        counts: countEntities(RECOVERED.state),
        inputPath: INPUT_PATH,
        sourceType: RECOVERED.sourceType,
        userDataDir: USER_DATA_DIR,
    };
}
