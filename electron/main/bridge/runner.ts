import { spawn } from "node:child_process";
import { logDebug } from "../../types/logger.ts";
import type { JsonValue, PlanGeneratePayload } from "../../types/types.ts";
import { readEnvironmentValue } from "../runtime-env.ts";
import { BRIDGE_HEARTBEAT_MS } from "./constants.ts";
import { bridgeTimeoutMs, root } from "./context.ts";
import {
    appendedLogTail,
    attachStreamHandlers,
    currentProgressSnapshot,
    hasProgressChanged,
    logHeartbeat,
    logParseFailure,
    logProcessClose,
    logProcessError,
    logTimeout,
} from "./diagnostics.ts";
import type {
    BridgeExecutionContext,
    BridgeRunSession,
    SettleHandlers,
} from "./types.ts";

interface RunBridgeForModuleArgs {
    args: string[];
    executionContext: BridgeExecutionContext;
    moduleName: string;
    parseOutput(stdout: string, stderr: string): JsonValue;
    payload: PlanGeneratePayload | undefined;
}

/**
 * Creates bridge run session with spawned process and defaults.
 * @param moduleName - Python module name to execute.
 * @param args - CLI arguments passed to the module.
 * @param executionContext - Execution context including env and logging info.
 * @returns Initialized bridge run session with active process handle.
 */
function createRunSession(
    moduleName: string,
    args: string[],
    executionContext: BridgeExecutionContext,
): BridgeRunSession {
    const PYTHON_BINARY = readEnvironmentValue("PYTHON_BIN") ?? "python";
    const TIMEOUT_MS = bridgeTimeoutMs();
    logDebug("Spawning planner bridge process.", {
        args,
        logPath: executionContext.logPath,
        module: moduleName,
        pythonBinary: PYTHON_BINARY,
        requestId: executionContext.requestId,
        timeoutMs: TIMEOUT_MS,
    });
    const PROCESS_HANDLE = spawn(PYTHON_BINARY, ["-m", moduleName, ...args], {
        cwd: root(),
        env: executionContext.env,
    });
    return {
        buffers: { stderr: "", stdout: "" },
        executionContext,
        moduleName,
        processHandle: PROCESS_HANDLE,
        startedAt: Date.now(),
        timeoutMs: TIMEOUT_MS,
    };
}

/**
 * Attaches spawn/exit/disconnect lifecycle diagnostics.
 */
function attachLifecycleLogs(session: BridgeRunSession): void {
    session.processHandle.on("spawn", () => {
        logDebug("Planner bridge subprocess spawned.", {
            module: session.moduleName,
            pid: session.processHandle.pid ?? null,
            requestId: session.executionContext.requestId,
        });
    });
    session.processHandle.on("exit", (exitCode, signal) => {
        logDebug("Planner bridge process exited.", {
            exitCode: Number(exitCode ?? 0),
            module: session.moduleName,
            requestId: session.executionContext.requestId,
            signal: signal ?? null,
        });
    });
    session.processHandle.on("disconnect", () => {
        logDebug("Planner bridge process disconnected.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
    });
}

/**
 * Writes optional payload to bridge stdin and closes input stream.
 */
function writePayloadAndClose(
    session: BridgeRunSession,
    payload: PlanGeneratePayload | undefined,
): void {
    const STDIN = session.processHandle.stdin;
    if (STDIN === null) {
        logDebug("Planner bridge stdin stream unavailable.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
        return;
    }
    STDIN.on("error", (error: Error) => {
        logDebug("Planner bridge stdin stream error.", {
            message: error.message,
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
    });
    STDIN.on("finish", () => {
        logDebug("Planner bridge stdin stream finished.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
    });
    if (payload !== undefined) {
        const SERIALIZED_PAYLOAD = JSON.stringify(payload);
        logDebug("Writing planner payload to stdin.", {
            requestId: session.executionContext.requestId,
            size: SERIALIZED_PAYLOAD.length,
        });
        const WRITE_RESULT = STDIN.write(SERIALIZED_PAYLOAD);
        logDebug("Planner bridge stdin write completed.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
            writeAcceptedImmediately: WRITE_RESULT,
        });
    }
    STDIN.end(() => {
        logDebug("Planner bridge stdin stream ended.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
    });
}

/**
 * Attaches timeout and heartbeat timers for active bridge process.
 * @param session - Active bridge run session with process handle and context.
 * @param onTimeout - Callback executed on bridge timeout before process termination.
 * @returns Function to clear both heartbeat and timeout timers.
 */
function startSessionTimers(
    session: BridgeRunSession,
    onTimeout: () => void,
): () => void {
    let previousSnapshot = currentProgressSnapshot(session);
    const HEARTBEAT = setInterval(() => {
        const CURRENT_SNAPSHOT = currentProgressSnapshot(session);
        if (!hasProgressChanged(previousSnapshot, CURRENT_SNAPSHOT)) {
            return;
        }
        const APPENDED_TAIL = appendedLogTail(
            previousSnapshot.logTail,
            CURRENT_SNAPSHOT.logTail,
        );
        previousSnapshot = CURRENT_SNAPSHOT;
        logHeartbeat({
            buffers: session.buffers,
            executionContext: session.executionContext,
            logTail: APPENDED_TAIL,
            moduleName: session.moduleName,
            startedAt: session.startedAt,
        });
    }, BRIDGE_HEARTBEAT_MS);
    const TIMEOUT = setTimeout(() => {
        const CURRENT_SNAPSHOT = currentProgressSnapshot(session);
        logTimeout({
            buffers: session.buffers,
            executionContext: session.executionContext,
            logTail: CURRENT_SNAPSHOT.logTail,
            moduleName: session.moduleName,
            startedAt: session.startedAt,
            timeoutMs: session.timeoutMs,
        });
        onTimeout();
    }, session.timeoutMs);
    return (): void => {
        clearInterval(HEARTBEAT);
        clearTimeout(TIMEOUT);
    };
}

/**
 * Builds guarded resolve/reject callbacks to avoid duplicate promise settlement.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 * @returns Object with guarded resolveOnce and rejectOnce callbacks.
 */
function createSettleHandlers(
    resolve: (value: JsonValue) => void,
    reject: (error: Error) => void,
): SettleHandlers {
    let settled = false;
    const REJECT_ONCE = (error: Error): void => {
        if (settled) {
            return;
        }
        settled = true;
        reject(error);
    };
    const RESOLVE_ONCE = (value: JsonValue): void => {
        if (settled) {
            return;
        }
        settled = true;
        resolve(value);
    };
    return {
        rejectOnce: REJECT_ONCE,
        resolveOnce: RESOLVE_ONCE,
    };
}

function rejectOnTimeout(
    session: BridgeRunSession,
    settle: SettleHandlers,
): void {
    session.processHandle.kill();
    settle.rejectOnce(
        new Error(
            `Planner bridge timed out after ${session.timeoutMs}ms (${session.moduleName}).`,
        ),
    );
}

interface HandleSessionCloseArgs {
    exitCode: number | null;
    parseOutput: RunBridgeForModuleArgs["parseOutput"];
    session: BridgeRunSession;
    settle: SettleHandlers;
    signal: NodeJS.Signals | null;
}

function handleSessionClose({
    exitCode,
    parseOutput,
    session,
    settle,
    signal,
}: HandleSessionCloseArgs): void {
    logProcessClose(
        session.buffers,
        session.executionContext,
        exitCode,
        signal,
    );

    try {
        settle.resolveOnce(
            parseOutput(session.buffers.stdout, session.buffers.stderr),
        );
    } catch (error) {
        logParseFailure(session.buffers, session.executionContext);

        if (error instanceof Error) {
            settle.rejectOnce(error);
            return;
        }

        settle.rejectOnce(new Error(String(error)));
    }
}

interface AttachSessionHandlersArgs {
    clearTimers(): void;
    parseOutput: RunBridgeForModuleArgs["parseOutput"];
    session: BridgeRunSession;
    settle: SettleHandlers;
}

function attachSessionHandlers({
    clearTimers,
    parseOutput,
    session,
    settle,
}: AttachSessionHandlersArgs): void {
    attachLifecycleLogs(session);
    attachStreamHandlers(
        session.processHandle,
        session.buffers,
        session.executionContext.requestId,
    );
    session.processHandle.on("error", (error: Error) => {
        clearTimers();
        logProcessError(error, session.buffers, session.executionContext);
        settle.rejectOnce(error);
    });
    session.processHandle.on("close", (exitCode, signal) => {
        clearTimers();
        handleSessionClose({
            exitCode,
            parseOutput,
            session,
            settle,
            signal,
        });
    });
}

/**
 * Executes one planner module candidate and parses bridge output.
 * @param args - CLI arguments passed to the module.
 * @param executionContext - Execution context including env and logging info.
 * @param moduleName - Python module name to execute.
 * @param payload - Optional JSON payload written to planner stdin.
 * @param parseOutput - Output parser that transforms raw stdout/stderr into JSON result or throws on failure.
 * @returns Parsed JSON result from the bridge output parser.
 */
export async function runBridgeForModule({
    args,
    executionContext,
    moduleName,
    payload,
    parseOutput,
}: RunBridgeForModuleArgs): Promise<JsonValue> {
    return await new Promise((resolve, reject) => {
        const SETTLE = createSettleHandlers(resolve, reject);
        const SESSION = createRunSession(moduleName, args, executionContext);
        const CLEAR_TIMERS = startSessionTimers(SESSION, () => {
            rejectOnTimeout(SESSION, SETTLE);
        });

        attachSessionHandlers({
            clearTimers: CLEAR_TIMERS,
            parseOutput,
            session: SESSION,
            settle: SETTLE,
        });
        writePayloadAndClose(SESSION, payload);
    });
}
