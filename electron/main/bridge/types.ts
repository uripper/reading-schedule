import type { spawn } from "node:child_process";
import type { JsonValue } from "../../types/types.js";

/**
 * Optional context passed in by the IPC caller before launching a bridge run.
 */
export interface BridgeRunContext {
    /**
     * Correlation identifier propagated into diagnostics and Python log metadata.
     */
    requestId?: string;
    /**
     * Per-user data directory used to resolve the Python bridge log file path.
     */
    userDataDir?: string;
}

/**
 * Execution context captured at bridge-run time for diagnostics and logging.
 */
export interface BridgeExecutionContext {
    /**
     * Environment variables used when spawning the Python bridge process.
     */
    env: NodeJS.ProcessEnv;
    /**
     * Absolute path to the Python bridge log file, or an empty string when unavailable.
     */
    logPath: string;
    /**
     * Request correlation identifier captured at run start.
     */
    requestId: string | null;
}

/**
 * Mutable output buffers populated from bridge process streams.
 */
export interface BridgeBuffers {
    /**
     * Aggregated `stderr` text captured so far.
     */
    stderr: string;
    /**
     * Aggregated `stdout` text captured so far.
     */
    stdout: string;
}

/**
 * Shared diagnostics payload for heartbeat, close, parse-failure, and timeout logging.
 */
export interface BridgeDiagnosticsArgs {
    /**
     * Current stream buffers at the time diagnostics are emitted.
     */
    buffers: BridgeBuffers;
    /**
     * Execution metadata captured before process spawn.
     */
    executionContext: BridgeExecutionContext;
    /**
     * Request-scoped tail of the Python bridge log at emission time.
     */
    logTail: string;
    /**
     * Python module executed via `python -m <moduleName>`.
     */
    moduleName: string;
    /**
     * Millisecond timestamp (`Date.now()`) recorded when the run started.
     */
    startedAt: number;
}

/**
 * Timeout-specific diagnostics payload.
 */
export interface BridgeTimeoutArgs extends BridgeDiagnosticsArgs {
    /**
     * Configured process timeout in milliseconds.
     */
    timeoutMs: number;
}

/**
 * Runtime state for one active bridge invocation.
 */
export interface BridgeRunSession {
    /**
     * Mutable stream buffers updated by stdout/stderr handlers.
     */
    buffers: BridgeBuffers;
    /**
     * Captured environment, log location, and correlation metadata for this run.
     */
    executionContext: BridgeExecutionContext;
    /**
     * Python module name being executed.
     */
    moduleName: string;
    /**
     * Child process handle returned by `spawn`.
     */
    processHandle: ReturnType<typeof spawn>;
    /**
     * Millisecond timestamp (`Date.now()`) when process launch began.
     */
    startedAt: number;
    /**
     * Timeout budget in milliseconds for this run.
     */
    timeoutMs: number;
}

/**
 * Lightweight progress summary used to detect heartbeat-worthy changes.
 */
export interface BridgeProgressSnapshot {
    /**
     * Latest request-scoped log tail snapshot.
     */
    logTail: string;
    /**
     * Number of characters currently captured in `stderr`.
     */
    stderrLength: number;
    /**
     * Number of characters currently captured in `stdout`.
     */
    stdoutLength: number;
}

/**
 * Idempotent promise-settlement callbacks for bridge execution.
 */
export interface SettleHandlers {
    /**
     * Rejects the pending run once; no-op after settlement.
     */
    rejectOnce(error: Error): void;
    /**
     * Resolves the pending run once; no-op after settlement.
     */
    resolveOnce(value: JsonValue): void;
}
