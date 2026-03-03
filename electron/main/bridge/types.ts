import type { spawn } from "node:child_process";
import type { JsonValue } from "../../types/types.js";

export interface BridgeRunContext {
    requestId?: string;
    userDataDir?: string;
}

export interface BridgeExecutionContext {
    env: NodeJS.ProcessEnv;
    logPath: string;
    requestId: string | null;
}

export interface BridgeBuffers {
    stderr: string;
    stdout: string;
}

export interface BridgeDiagnosticsArgs {
    buffers: BridgeBuffers;
    executionContext: BridgeExecutionContext;
    logTail: string;
    moduleName: string;
    startedAt: number;
}

export interface BridgeTimeoutArgs extends BridgeDiagnosticsArgs {
    timeoutMs: number;
}

export interface BridgeRunSession {
    buffers: BridgeBuffers;
    executionContext: BridgeExecutionContext;
    moduleName: string;
    processHandle: ReturnType<typeof spawn>;
    startedAt: number;
    timeoutMs: number;
}

export interface BridgeProgressSnapshot {
    logTail: string;
    stderrLength: number;
    stdoutLength: number;
}

export interface SettleHandlers {
    rejectOnce(error: Error): void;
    resolveOnce(value: JsonValue): void;
}
