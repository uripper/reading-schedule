import { spawn } from "node:child_process";
import { logDebug } from "../../renderer/logger.js";
import { type JsonValue, type PlanGeneratePayload } from "../../types/types.js";
import { BRIDGE_HEARTBEAT_MS } from "./constants.js";
import { bridgeTimeoutMs, root } from "./context.js";
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
} from "./diagnostics.js";
import {
    type BridgeExecutionContext,
    type BridgeRunSession,
    type SettleHandlers,
} from "./types.js";

interface RunBridgeForModuleArgs {
    args: string[];
    executionContext: BridgeExecutionContext;
    moduleName: string;
    parseOutput(stdout: string, stderr: string): JsonValue;
    payload: PlanGeneratePayload | undefined;
}

/**
 * Creates bridge run session with spawned process and defaults.
 */
function createRunSession(
    moduleName: string,
    args: string[],
    executionContext: BridgeExecutionContext,
): BridgeRunSession {
    const PYTHON_BINARY = process.env.PYTHON_BIN ?? "python";
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

/**
 * Executes one planner module candidate and parses bridge output.
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
            SESSION.processHandle.kill();
            SETTLE.rejectOnce(
                new Error(
                    `Planner bridge timed out after ${SESSION.timeoutMs}ms (${moduleName}).`,
                ),
            );
        });

        attachLifecycleLogs(SESSION);
        attachStreamHandlers(
            SESSION.processHandle,
            SESSION.buffers,
            SESSION.executionContext.requestId,
        );
        SESSION.processHandle.on("error", (error: Error) => {
            CLEAR_TIMERS();
            logProcessError(error, SESSION.buffers, SESSION.executionContext);
            SETTLE.rejectOnce(error);
        });
        SESSION.processHandle.on("close", (exitCode, signal) => {
            CLEAR_TIMERS();
            logProcessClose(
                SESSION.buffers,
                SESSION.executionContext,
                exitCode,
                signal,
            );
            try {
                SETTLE.resolveOnce(
                    parseOutput(SESSION.buffers.stdout, SESSION.buffers.stderr),
                );
            } catch (error) {
                logParseFailure(SESSION.buffers, SESSION.executionContext);
                if (error instanceof Error) {
                    SETTLE.rejectOnce(error);
                    return;
                }
                SETTLE.rejectOnce(new Error(String(error)));
            }
        });
        writePayloadAndClose(SESSION, payload);
    });
}
