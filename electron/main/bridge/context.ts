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
    return path.join(__dirname, "..", "..");
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
 * @param context Optional runtime context from IPC layer.
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
 * @param context Optional runtime context from IPC layer.
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
