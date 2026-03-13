import * as fs from "node:fs";
import * as path from "node:path";
import { pythonBridgeLogPath } from "../state_store_paths";
import {
    BRIDGE_LOG_PATH_KEY,
    BRIDGE_REQUEST_ID_KEY,
    BRIDGE_TIMEOUT_MS_KEY,
    DEFAULT_BRIDGE_TIMEOUT_MS,
    MAX_BRIDGE_TIMEOUT_MS,
    MIN_BRIDGE_TIMEOUT_MS,
    PYTHONPATH_KEY,
    PYTHONPATH_SEGMENT,
} from "./constants.js";
import type { BridgeExecutionContext, BridgeRunContext } from "./types.js";

const ROOT_MARKER_FILE = "pyproject.toml";
const ROOT_MARKER_PATH_SEGMENTS = ["src", "reading_plan"];
const ROOT_SEARCH_ASCENT_LIMIT = 12;

function hasRootMarkers(directory: string): boolean {
    const ROOT_MARKER_PATH = path.join(directory, ...ROOT_MARKER_PATH_SEGMENTS);
    const ROOT_FILE_PATH = path.join(directory, ROOT_MARKER_FILE);
    return fs.existsSync(ROOT_MARKER_PATH) && fs.existsSync(ROOT_FILE_PATH);
}

/**
 * Ascend parent directories from a starting path to find a directory that contains project root markers.
 * @example
 * resolveRootFrom('/home/user/project/src')
 * '/home/user/project'
 * @param {{string}} {{startDirectory}} - Starting directory path to begin searching for root markers.
 * @returns {{(string|null)}} Return the path of the found root directory, or null if no root markers are found within the ascent limit or the filesystem root is reached.
 **/
function resolveRootFrom(startDirectory: string): string | null {
    let currentDirectory = startDirectory;
    let steps = 0;
    while (steps < ROOT_SEARCH_ASCENT_LIMIT) {
        if (hasRootMarkers(currentDirectory)) {
            return currentDirectory;
        }
        const PARENT_DIRECTORY = path.dirname(currentDirectory);
        if (PARENT_DIRECTORY === currentDirectory) {
            return null;
        }
        currentDirectory = PARENT_DIRECTORY;
        steps += 1;
    }
    return null;
}

/**
 * Resolves subprocess timeout for planner bridge execution.
 * @returns Timeout in milliseconds.
 */
export function bridgeTimeoutMs(): number {
    const RAW_TIMEOUT = process.env[BRIDGE_TIMEOUT_MS_KEY];
    if (typeof RAW_TIMEOUT !== "string" || RAW_TIMEOUT.trim() === "") {
        return DEFAULT_BRIDGE_TIMEOUT_MS;
    }
    const PARSED = Number(RAW_TIMEOUT);
    if (!Number.isFinite(PARSED)) {
        return DEFAULT_BRIDGE_TIMEOUT_MS;
    }
    const ROUNDED = Math.floor(PARSED);
    return Math.min(
        MAX_BRIDGE_TIMEOUT_MS,
        Math.max(MIN_BRIDGE_TIMEOUT_MS, ROUNDED),
    );
}

/**
 * Resolves the repository root used by the Python bridge process.
 * @returns Absolute path to the project root directory.
 */
export function root(): string {
    const FROM_MODULE_DIRECTORY = resolveRootFrom(__dirname);
    if (FROM_MODULE_DIRECTORY !== null) {
        return FROM_MODULE_DIRECTORY;
    }
    const FROM_WORKING_DIRECTORY = resolveRootFrom(process.cwd());
    if (FROM_WORKING_DIRECTORY !== null) {
        return FROM_WORKING_DIRECTORY;
    }
    throw new Error(
        "Could not resolve planner bridge project root from runtime directories.",
    );
}

/**
 * Builds environment variables for the planner subprocess.
 * @returns Process environment including the planner PYTHONPATH.
 */
function pyEnv(): NodeJS.ProcessEnv {
    return {
        ...process.env,
        [PYTHONPATH_KEY]: path.join(root(), PYTHONPATH_SEGMENT),
    };
}

/**
 * Builds bridge environment variables with optional debug context.
 * @param context - Optional runtime context from IPC layer.
 * @returns Child process environment variables.
 */
function bridgeEnv(context?: BridgeRunContext): NodeJS.ProcessEnv {
    const ENV = pyEnv();
    if (context?.userDataDir) {
        ENV[BRIDGE_LOG_PATH_KEY] = pythonBridgeLogPath(context.userDataDir);
    }
    if (context?.requestId) {
        ENV[BRIDGE_REQUEST_ID_KEY] = context.requestId;
    }
    return ENV;
}

/**
 * Resolves runtime execution context values used by bridge instrumentation.
 * @param context - Optional runtime context from IPC layer.
 * @returns Expanded bridge execution context.
 */
export function resolveExecutionContext(
    context?: BridgeRunContext,
): BridgeExecutionContext {
    const ENV = bridgeEnv(context);
    let requestId: string | null = null;
    if (typeof context?.requestId === "string" && context.requestId !== "") {
        requestId = context.requestId;
    }
    let logPath = "";
    if (context?.userDataDir) {
        logPath = pythonBridgeLogPath(context.userDataDir);
    }
    return {
        env: ENV,
        logPath,
        requestId,
    };
}
