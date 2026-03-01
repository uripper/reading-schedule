/**
 * @file Bridge that invokes the Python planner module from Electron.
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseBridgeResponseEnvelope } from "../contracts/planner.js";
import { logDebug } from "../renderer/logger.js";
import { type JsonValue, type PlanGeneratePayload } from "../types/types.js";
import { pythonBridgeLogPath } from "./state_store_paths";

const PRIMARY_PLANNER_MODULE = "reading_plan.gui_api";
const FALLBACK_PLANNER_MODULE = "reading_plan.cli";
const PLANNER_MODULE_CANDIDATES = [
    PRIMARY_PLANNER_MODULE,
    FALLBACK_PLANNER_MODULE,
];
const PYTHONPATH_SEGMENT = "src";
const PYTHONPATH_KEY = "PYTHONPATH";
const BRIDGE_LOG_PATH_KEY = "READING_PLAN_BRIDGE_LOG_PATH";
const BRIDGE_REQUEST_ID_KEY = "READING_PLAN_BRIDGE_REQUEST_ID";
const OUTPUT_PREVIEW_MAX_CHARS = 200;
const LOG_TAIL_MAX_BYTES = 20_000;
const LOG_TAIL_MAX_LINES = 120;
const BRIDGE_HEARTBEAT_MS = 5_000;
const DEFAULT_BRIDGE_TIMEOUT_MS = 300_000;
const MIN_BRIDGE_TIMEOUT_MS = 1_000;
const MAX_BRIDGE_TIMEOUT_MS = 3_600_000;
const BRIDGE_TIMEOUT_MS_KEY = "READING_PLAN_BRIDGE_TIMEOUT_MS";

interface BridgeRunContext {
    requestId?: string;
    userDataDir?: string;
}

interface BridgeExecutionContext {
    env: NodeJS.ProcessEnv;
    logPath: string;
    requestId: string | null;
}

interface BridgeBuffers {
    stderr: string;
    stdout: string;
}

interface BridgeDiagnosticsArgs {
    buffers: BridgeBuffers;
    executionContext: BridgeExecutionContext;
    logTail: string;
    moduleName: string;
    startedAt: number;
}

interface BridgeTimeoutArgs extends BridgeDiagnosticsArgs {
    timeoutMs: number;
}

interface BridgeRunSession {
    buffers: BridgeBuffers;
    executionContext: BridgeExecutionContext;
    moduleName: string;
    processHandle: ReturnType<typeof spawn>;
    startedAt: number;
    timeoutMs: number;
}

interface BridgeProgressSnapshot {
    logTail: string;
    stderrLength: number;
    stdoutLength: number;
}

interface SettleHandlers {
    rejectOnce(error: Error): void;
    resolveOnce(value: JsonValue): void;
}

/**
 * Resolves subprocess timeout for planner bridge execution.
 * @returns Timeout in milliseconds.
 */
function bridgeTimeoutMs(): number {
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
function root(): string {
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
function resolveExecutionContext(
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

/**
 * Appends a stream chunk to an accumulated output buffer.
 * @param target Existing text buffer.
 * @param chunk New stdout/stderr chunk from the child process.
 * @returns Updated output buffer.
 */
function appendChunk(target: string, chunk: Buffer | string): string {
    return target + chunk.toString();
}

/**
 * Returns a bounded preview for verbose log streams.
 * @param text Source text.
 * @returns Truncated text preview.
 */
function preview(text: string): string {
    return text.slice(0, OUTPUT_PREVIEW_MAX_CHARS);
}

/**
 * Reads a bounded tail from a text log file.
 * @param filePath Absolute log file path.
 * @returns Tail text or empty string when unavailable.
 */
function readLogTail(filePath: string): string {
    try {
        const CONTENT = fs.readFileSync(filePath, "utf-8");
        const START = Math.max(0, CONTENT.length - LOG_TAIL_MAX_BYTES);
        const WINDOW = CONTENT.slice(START);
        const LINES = WINDOW.split("\n");
        return LINES.slice(-LOG_TAIL_MAX_LINES).join("\n");
    } catch {
        return "";
    }
}

/**
 * Filters log tail text to entries for a specific request identifier.
 * @param logTail Full log tail text.
 * @param requestId Current request identifier.
 * @returns Request-scoped log tail text.
 */
function logTailForRequest(logTail: string, requestId: string | null): string {
    if (requestId === null) {
        return logTail;
    }
    const REQUEST_MARKER = `request=${requestId}`;
    const LINES = logTail.split("\n");
    const MATCHED = LINES.filter((line) => line.includes(REQUEST_MARKER));
    return MATCHED.join("\n");
}

/**
 * Returns only the newly appended segment of a log tail string.
 * @param previous Previous tail content.
 * @param current Current tail content.
 * @returns Newly appended tail content or current content when no prefix match exists.
 */
function appendedLogTail(previous: string, current: string): string {
    if (current.startsWith(previous)) {
        return current.slice(previous.length);
    }
    return current;
}

/**
 * Appends child-process stdout/stderr and emits chunk diagnostics.
 * @param processHandle Child process handle.
 * @param buffers Mutable output buffers.
 * @param requestId Planner request correlation identifier.
 */
function attachStreamHandlers(
    processHandle: ReturnType<typeof spawn>,
    buffers: BridgeBuffers,
    requestId: string | null,
): void {
    const STDOUT = processHandle.stdout;
    if (STDOUT !== null) {
        STDOUT.on("data", (chunk: Buffer | string) => {
            const TEXT = chunk.toString();
            buffers.stdout = appendChunk(buffers.stdout, TEXT);
            logDebug("Planner bridge stdout chunk.", {
                preview: preview(TEXT),
                requestId,
                size: TEXT.length,
            });
        });
    }

    const STDERR = processHandle.stderr;
    if (STDERR === null) {
        return;
    }

    STDERR.on("data", (chunk: Buffer | string) => {
        const TEXT = chunk.toString();
        buffers.stderr = appendChunk(buffers.stderr, TEXT);
        logDebug("Planner bridge stderr chunk.", {
            preview: preview(TEXT),
            requestId,
            size: TEXT.length,
        });
    });
}

/**
 * Logs planner process close state including optional Python log tail.
 * @param buffers Collected stdout/stderr buffers.
 * @param executionContext Expanded bridge runtime context.
 * @param exitCode Process exit code.
 * @param signal Process termination signal.
 */
function logProcessClose(
    buffers: BridgeBuffers,
    executionContext: BridgeExecutionContext,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
): void {
    let logTail = "";
    if (executionContext.logPath !== "") {
        logTail = readLogTail(executionContext.logPath);
    }
    logDebug("Planner bridge process closed.", {
        exitCode: Number(exitCode ?? 0),
        logTail,
        requestId: executionContext.requestId,
        signal,
        stderrLength: buffers.stderr.length,
        stdoutLength: buffers.stdout.length,
    });
}

/**
 * Logs process-level bridge error diagnostics.
 * @param error Process error emitted before close.
 * @param buffers Collected stdout/stderr buffers.
 * @param executionContext Expanded bridge runtime context.
 */
function logProcessError(
    error: Error,
    buffers: BridgeBuffers,
    executionContext: BridgeExecutionContext,
): void {
    let logTail = "";
    if (executionContext.logPath !== "") {
        logTail = readLogTail(executionContext.logPath);
    }
    logDebug("Planner bridge process error before close.", {
        errorMessage: error.message,
        logTail,
        requestId: executionContext.requestId,
        stderrPreview: preview(buffers.stderr),
    });
}

/**
 * Emits parse-failure diagnostics with bounded previews and python log tails.
 * @param buffers Collected stdout/stderr buffers.
 * @param executionContext Expanded bridge runtime context.
 */
function logParseFailure(
    buffers: BridgeBuffers,
    executionContext: BridgeExecutionContext,
): void {
    let logTail = "";
    if (executionContext.logPath !== "") {
        logTail = readLogTail(executionContext.logPath);
    }
    logDebug("Planner bridge parse failure.", {
        logTail,
        requestId: executionContext.requestId,
        stderrPreview: preview(buffers.stderr),
        stdoutPreview: preview(buffers.stdout),
    });
}

/**
 * Logs heartbeat diagnostics while planner subprocess is still running.
 * @param moduleName Python module currently executing.
 * @param buffers Collected stdout/stderr buffers.
 * @param executionContext Expanded bridge runtime context.
 * @param startedAt Timestamp for elapsed duration calculations.
 */
function logHeartbeat(args: BridgeDiagnosticsArgs): void {
    logDebug("Planner bridge still running.", {
        elapsedMs: Date.now() - args.startedAt,
        logTail: args.logTail,
        module: args.moduleName,
        requestId: args.executionContext.requestId,
        stderrLength: args.buffers.stderr.length,
        stdoutLength: args.buffers.stdout.length,
    });
}

/**
 * Captures the current bridge progress snapshot for change detection.
 * @param session Active bridge run session.
 * @returns Current progress snapshot.
 */
function currentProgressSnapshot(
    session: BridgeRunSession,
): BridgeProgressSnapshot {
    let logTail = "";
    if (session.executionContext.logPath !== "") {
        const RAW_TAIL = readLogTail(session.executionContext.logPath);
        logTail = logTailForRequest(
            RAW_TAIL,
            session.executionContext.requestId,
        );
    }
    return {
        logTail,
        stderrLength: session.buffers.stderr.length,
        stdoutLength: session.buffers.stdout.length,
    };
}

/**
 * Determines whether bridge progress changed since the previous snapshot.
 * @param previous Previous captured snapshot.
 * @param current Current captured snapshot.
 * @returns True when any tracked progress field changed.
 */
function hasProgressChanged(
    previous: BridgeProgressSnapshot,
    current: BridgeProgressSnapshot,
): boolean {
    if (previous.stderrLength !== current.stderrLength) {
        return true;
    }
    if (previous.stdoutLength !== current.stdoutLength) {
        return true;
    }
    return previous.logTail !== current.logTail;
}

/**
 * Logs timeout diagnostics before process termination.
 * @param moduleName Python module currently executing.
 * @param buffers Collected stdout/stderr buffers.
 * @param executionContext Expanded bridge runtime context.
 * @param startedAt Timestamp for elapsed duration calculations.
 * @param timeoutMs Effective timeout in milliseconds.
 */
function logTimeout(args: BridgeTimeoutArgs): void {
    let logTail = "";
    if (args.executionContext.logPath !== "") {
        logTail = readLogTail(args.executionContext.logPath);
    }
    logDebug("Planner bridge timed out.", {
        elapsedMs: Date.now() - args.startedAt,
        logTail,
        module: args.moduleName,
        requestId: args.executionContext.requestId,
        stderrPreview: preview(args.buffers.stderr),
        stdoutPreview: preview(args.buffers.stdout),
        timeoutMs: args.timeoutMs,
    });
}

/**
 * Creates bridge run session with spawned process and defaults.
 * @param moduleName Python module name passed to `python -m`.
 * @param args Planner CLI arguments passed after the module name.
 * @param executionContext Bridge execution context.
 * @returns Initialized run session.
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
 * @param session Active bridge run session.
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
 * @param session Active bridge run session.
 * @param payload Optional planner payload.
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
 * @param session Active bridge run session.
 * @param onTimeout Callback invoked when timeout elapses.
 * @returns Timer cleanup callback.
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
 * @param resolve Promise resolve callback.
 * @param reject Promise reject callback.
 * @returns Guarded settle helpers.
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
 * Resolves or rejects a bridge session using buffered outputs.
 * @param session Active bridge run session.
 * @param settle Promise settlement helpers.
 */
function settleFromClose(
    session: BridgeRunSession,
    settle: SettleHandlers,
): void {
    try {
        settle.resolveOnce(
            parseBridgeOutput(session.buffers.stdout, session.buffers.stderr),
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

/**
 * Parses planner JSON output and converts planner failures to thrown errors.
 * @param stdout Raw stdout text from the planner subprocess.
 * @param stderr Raw stderr text from the planner subprocess.
 * @returns Parsed planner payload or null when no data is returned.
 */
function parseBridgeOutput(stdout: string, stderr: string): JsonValue {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stdout || "{}");
    } catch {
        throw new Error(stderr || stdout || "Invalid planner response");
    }

    const ENVELOPE = parseBridgeResponseEnvelope(parsed);
    if (ENVELOPE.ok !== true) {
        const ERROR_TEXT = ENVELOPE.error ?? stderr;
        if (ERROR_TEXT) {
            throw new Error(ERROR_TEXT);
        }
        throw new Error("Planner failed");
    }
    if (ENVELOPE.data === undefined) {
        return null;
    }
    return ENVELOPE.data;
}

/**
 * Checks whether a bridge error indicates missing Python module import.
 * @param error Error thrown by bridge invocation.
 * @param moduleName Module that was attempted.
 * @returns True when error indicates module import failure.
 */
function isMissingModuleError(error: unknown, moduleName: string): boolean {
    if (!(error instanceof Error)) {
        return false;
    }
    const NO_MODULE_MESSAGE = `No module named ${moduleName}`;
    const QUOTED_NO_MODULE_MESSAGE = `No module named '${moduleName}'`;
    return (
        error.message.includes(NO_MODULE_MESSAGE) ||
        error.message.includes(QUOTED_NO_MODULE_MESSAGE)
    );
}

/**
 * Executes one planner module candidate and parses bridge output.
 * @param moduleName Python module name passed to `python -m`.
 * @param args Planner CLI arguments passed after the module name.
 * @param payload Optional JSON payload written to planner stdin.
 * @param executionContext Bridge execution context.
 * @returns Parsed planner JSON response.
 */
async function runBridgeForModule(
    moduleName: string,
    args: string[],
    payload: PlanGeneratePayload | undefined,
    executionContext: BridgeExecutionContext,
): Promise<JsonValue> {
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
            settleFromClose(SESSION, SETTLE);
        });
        writePayloadAndClose(SESSION, payload);
    });
}

/**
 * Executes the Python planner bridge command and returns parsed JSON output.
 * @param args Planner CLI arguments passed after the module name.
 * @param payload Optional JSON payload written to planner stdin.
 * @returns Parsed planner JSON response.
 */
export async function runBridge(
    args: string[],
    payload?: PlanGeneratePayload,
    context?: BridgeRunContext,
): Promise<JsonValue> {
    const EXECUTION_CONTEXT = resolveExecutionContext(context);
    const MODULE_COUNT = PLANNER_MODULE_CANDIDATES.length;
    for (let moduleIndex = 0; moduleIndex < MODULE_COUNT; moduleIndex += 1) {
        const MODULE_NAME = PLANNER_MODULE_CANDIDATES[moduleIndex];
        try {
            return await runBridgeForModule(
                MODULE_NAME,
                args,
                payload,
                EXECUTION_CONTEXT,
            );
        } catch (error) {
            const IS_LAST_MODULE = moduleIndex === MODULE_COUNT - 1;
            if (isMissingModuleError(error, MODULE_NAME) && !IS_LAST_MODULE) {
                logDebug("Planner module missing. Trying fallback module.", {
                    missingModule: MODULE_NAME,
                    nextModule: PLANNER_MODULE_CANDIDATES[moduleIndex + 1],
                    requestId: EXECUTION_CONTEXT.requestId,
                });
                continue;
            }
            throw error;
        }
    }
    throw new Error("Planner bridge failed: no candidate module succeeded.");
}
