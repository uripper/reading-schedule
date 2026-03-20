import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "node:process";
import {
    backupTargets,
    readStateFromInput,
    writeRecoveredState,
} from "./state_recover_store.mjs";

const APP_NAME = "reading-plan-gui";
const FORCE_FLAG = "--force";
const INPUT_FLAG = "--input";
const USER_DATA_DIR_FLAG = "--user-data-dir";

function nextArgumentValue(argv, index) {
    return String(argv[index + 1] || "");
}

function parsedArgument(key, value, index) {
    return { index, key, value };
}

function inputPathArgument(argv, index) {
    return parsedArgument(
        "inputPath",
        nextArgumentValue(argv, index),
        index + 1,
    );
}

function userDataDirArgument(argv, index) {
    return parsedArgument(
        "userDataDir",
        nextArgumentValue(argv, index),
        index + 1,
    );
}

function parseCliArgument(argv, index) {
    const VALUE = String(argv[index] || "");
    if (VALUE === INPUT_FLAG) {
        return inputPathArgument(argv, index);
    }
    if (VALUE === USER_DATA_DIR_FLAG) {
        return userDataDirArgument(argv, index);
    }
    if (VALUE === FORCE_FLAG) {
        return parsedArgument("force", true, index);
    }
    throw new TypeError(`Unknown argument: ${VALUE}`);
}

function requireInputPath(inputPath) {
    if (inputPath) {
        return inputPath;
    }
    throw new TypeError(
        "Missing required argument: --input <path-to-json-or-sqlite>",
    );
}

/**
 * Parses CLI arguments for state recovery.
 * @param {string[]} argv - CLI arguments excluding `node` and script path.
 * @returns {{ inputPath: string, userDataDir: string | null, force: boolean }} Parsed arguments.
 */
function parseArgs(argv) {
    let parsedArgs = { force: false, inputPath: "", userDataDir: null };
    for (let index = 0; index < argv.length; index += 1) {
        const ARGUMENT = parseCliArgument(argv, index);
        parsedArgs = { ...parsedArgs, [ARGUMENT.key]: ARGUMENT.value };
        index = ARGUMENT.index;
    }
    return { ...parsedArgs, inputPath: requireInputPath(parsedArgs.inputPath) };
}

function windowsUserDataDir(homeDirectory) {
    const BASE_DIRECTORY =
        env.APPDATA || path.join(homeDirectory, "AppData", "Roaming");
    return path.join(BASE_DIRECTORY, APP_NAME);
}

function macUserDataDir(homeDirectory) {
    return path.join(homeDirectory, "Library", "Application Support", APP_NAME);
}

function linuxConfigDirectory(homeDirectory) {
    return env.XDG_CONFIG_HOME || path.join(homeDirectory, ".config");
}

/**
 * Resolves default Electron-like user data path for this app.
 * @returns {string} Absolute default user-data directory.
 */
function defaultUserDataDir() {
    const HOME = os.homedir();
    if (process.platform === "win32") {
        return windowsUserDataDir(HOME);
    }
    if (process.platform === "darwin") {
        return macUserDataDir(HOME);
    }
    return path.join(linuxConfigDirectory(HOME), APP_NAME);
}

function arrayLength(value) {
    if (!Array.isArray(value)) {
        return 0;
    }
    return value.length;
}

function scheduleRowsCount(state) {
    const LAST_RESULT = state.last_result;
    if (!LAST_RESULT || typeof LAST_RESULT !== "object") {
        return 0;
    }
    return arrayLength(LAST_RESULT.schedule);
}

function scheduleCompletionsCount(state) {
    const COMPLETIONS = state.schedule_completions;
    if (!COMPLETIONS || typeof COMPLETIONS !== "object") {
        return 0;
    }
    if (Array.isArray(COMPLETIONS)) {
        return 0;
    }
    return Object.keys(COMPLETIONS).length;
}

/**
 * Counts top-level persisted entities for summary output.
 * @param {Record<string, unknown>} state - Recovered planner state payload.
 * @returns {{ books: number, sessions: number, scheduleRows: number, scheduleCompletions: number }} Count summary.
 */
function countEntities(state) {
    return {
        books: arrayLength(state.books),
        scheduleCompletions: scheduleCompletionsCount(state),
        scheduleRows: scheduleRowsCount(state),
        sessions: arrayLength(state.sessions),
    };
}

function resolvedUserDataDir(args) {
    return path.resolve(args.userDataDir || defaultUserDataDir());
}

function recoveredStateBackups(args, userDataDir) {
    const STAMP = new Date().toISOString().replace(/[^0-9]/g, "");
    const BACKUPS = backupTargets(userDataDir, STAMP);
    if (args.force !== true && BACKUPS.length > 0) {
        throw new TypeError(
            "Refusing to overwrite existing state without --force.",
        );
    }
    return BACKUPS;
}

function recoverySummary({ backups, inputPath, recovered, userDataDir }) {
    return {
        backups,
        counts: countEntities(recovered.state),
        inputPath,
        sourceType: recovered.sourceType,
        userDataDir,
    };
}

/**
 * Recovers state from source input and writes it to canonical userData targets.
 * @param {string[]} argv - CLI arguments excluding `node` and script path.
 * @returns {{ sourceType: string, inputPath: string, userDataDir: string, backups: string[], counts: Record<string, number> }} Recovery summary.
 */
export function recoverStateFromArgs(argv) {
    const ARGS = parseArgs(argv);
    const INPUT_PATH = path.resolve(ARGS.inputPath);
    if (!fs.existsSync(INPUT_PATH)) {
        throw new TypeError(`Input file not found: ${INPUT_PATH}`);
    }
    const USER_DATA_DIR = resolvedUserDataDir(ARGS);
    const BACKUPS = recoveredStateBackups(ARGS, USER_DATA_DIR);
    const RECOVERED = readStateFromInput(INPUT_PATH);
    writeRecoveredState(USER_DATA_DIR, RECOVERED.state);
    return recoverySummary({
        backups: BACKUPS,
        inputPath: INPUT_PATH,
        recovered: RECOVERED,
        userDataDir: USER_DATA_DIR,
    });
}
