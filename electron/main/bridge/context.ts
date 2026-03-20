import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { processEnvironment, readEnvironmentValue } from "../runtime-env.ts";
import { pythonBridgeLogPath } from "../state_store_paths.ts";
import {
    BRIDGE_LOG_PATH_KEY,
    BRIDGE_REQUEST_ID_KEY,
    BRIDGE_TIMEOUT_MS_KEY,
    DEFAULT_BRIDGE_TIMEOUT_MS,
    MAX_BRIDGE_TIMEOUT_MS,
    MIN_BRIDGE_TIMEOUT_MS,
    PYTHONPATH_KEY,
    PYTHONPATH_SEGMENT,
} from "./constants.ts";
import { hasBundledPlanner } from "./runtime.ts";
import type { BridgeExecutionContext, BridgeRunContext } from "./types.d.ts";

const ROOT_MARKER_FILE = "pyproject.toml";
const ROOT_MARKER_PATH_SEGMENTS = ["src", "reading_plan"];
const ROOT_SEARCH_ASCENT_LIMIT = 12;

function hasRootMarkers(directory: string): boolean {
    const ROOT_MARKER_PATH = join(directory, ...ROOT_MARKER_PATH_SEGMENTS);
    const ROOT_FILE_PATH = join(directory, ROOT_MARKER_FILE);
    return existsSync(ROOT_MARKER_PATH) && existsSync(ROOT_FILE_PATH);
}

function parentDirectory(directory: string): string | null {
    const PARENT_DIRECTORY = dirname(directory);
    if (PARENT_DIRECTORY === directory) {
        return null;
    }
    return PARENT_DIRECTORY;
}

function rootSearchStep(directory: string): string | null {
    if (hasRootMarkers(directory)) {
        return directory;
    }
    return parentDirectory(directory);
}

/**
 * Ascend parent directories from a starting path to find a directory that contains project root markers.
 * @example
 * resolveRootFrom('/home/user/project/src')
 * '/home/user/project'
 * @param startDirectory - Starting directory path to begin searching for root markers.
 * @returns Return the path of the found root directory, or null if no root markers are found within the ascent limit or the filesystem root is reached.
 */
function resolveRootFromStep(
    currentDirectory: string,
    remainingSteps: number,
): string | null {
    if (remainingSteps <= 0) {
        return null;
    }
    const NEXT_DIRECTORY = rootSearchStep(currentDirectory);
    if (NEXT_DIRECTORY === null) {
        return null;
    }
    if (NEXT_DIRECTORY === currentDirectory) {
        return currentDirectory;
    }
    return resolveRootFromStep(NEXT_DIRECTORY, remainingSteps - 1);
}

function resolveRootFrom(startDirectory: string): string | null {
    return resolveRootFromStep(startDirectory, ROOT_SEARCH_ASCENT_LIMIT);
}

function parsedBridgeTimeout(rawTimeout: unknown): number | null {
    if (typeof rawTimeout !== "string" || rawTimeout.trim() === "") {
        return null;
    }
    const PARSED = Number(rawTimeout);
    if (!Number.isFinite(PARSED)) {
        return null;
    }
    return Math.floor(PARSED);
}

function clampedBridgeTimeout(timeoutMs: number): number {
    return Math.min(
        MAX_BRIDGE_TIMEOUT_MS,
        Math.max(MIN_BRIDGE_TIMEOUT_MS, timeoutMs),
    );
}

/**
 * Resolves subprocess timeout for planner bridge execution.
 * @returns Timeout in milliseconds.
 */
export function bridgeTimeoutMs(): number {
    const PARSED_TIMEOUT = parsedBridgeTimeout(
        readEnvironmentValue(BRIDGE_TIMEOUT_MS_KEY),
    );
    if (PARSED_TIMEOUT === null) {
        return DEFAULT_BRIDGE_TIMEOUT_MS;
    }
    return clampedBridgeTimeout(PARSED_TIMEOUT);
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

function baseBridgeEnvironment(): NodeJS.ProcessEnv {
    const ENV = { ...processEnvironment() };
    if (hasBundledPlanner()) {
        return ENV;
    }
    ENV[PYTHONPATH_KEY] = join(root(), PYTHONPATH_SEGMENT);
    return ENV;
}

/**
 * Builds bridge environment variables with optional debug context.
 * @param context - Optional runtime context from IPC layer.
 * @returns Child process environment variables.
 */
function bridgeEnv(context?: BridgeRunContext): NodeJS.ProcessEnv {
    const ENV = baseBridgeEnvironment();
    if (context?.userDataDir) {
        ENV[BRIDGE_LOG_PATH_KEY] = pythonBridgeLogPath(context.userDataDir);
    }
    if (context?.requestId) {
        ENV[BRIDGE_REQUEST_ID_KEY] = context.requestId;
    }
    return ENV;
}

function executionContextRequestId(context?: BridgeRunContext): string | null {
    if (typeof context?.requestId === "string" && context.requestId !== "") {
        return context.requestId;
    }
    return null;
}

function executionContextLogPath(context?: BridgeRunContext): string {
    if (!context?.userDataDir) {
        return "";
    }
    return pythonBridgeLogPath(context.userDataDir);
}

/**
 * Resolves runtime execution context values used by bridge instrumentation.
 * @param context - Optional runtime context from IPC layer.
 * @returns Expanded bridge execution context.
 */
export function resolveExecutionContext(
    context?: BridgeRunContext,
): BridgeExecutionContext {
    return {
        env: bridgeEnv(context),
        logPath: executionContextLogPath(context),
        requestId: executionContextRequestId(context),
    };
}
