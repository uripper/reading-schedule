import * as fs from "node:fs";
import { logDebug } from "../../renderer/logger.js";
import {
    LOG_TAIL_MAX_BYTES,
    LOG_TAIL_MAX_LINES,
    OUTPUT_PREVIEW_MAX_CHARS,
} from "./constants.js";
import {
    type BridgeBuffers,
    type BridgeDiagnosticsArgs,
    type BridgeExecutionContext,
    type BridgeProgressSnapshot,
    type BridgeRunSession,
    type BridgeTimeoutArgs,
} from "./types.js";

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
export function appendedLogTail(previous: string, current: string): string {
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
export function attachStreamHandlers(
    processHandle: BridgeRunSession["processHandle"],
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
 */
export function logProcessClose(
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
 */
export function logProcessError(
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
 */
export function logParseFailure(
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
 */
export function logHeartbeat(args: BridgeDiagnosticsArgs): void {
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
 */
export function currentProgressSnapshot(
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
 */
export function hasProgressChanged(
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
 */
export function logTimeout(args: BridgeTimeoutArgs): void {
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
