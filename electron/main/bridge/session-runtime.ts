import { logDebug } from "../../types/logger.ts";
import type { PlanGeneratePayload } from "../../types/types.ts";
import { BRIDGE_HEARTBEAT_MS } from "./constants.ts";
import {
    appendedLogTail,
    currentProgressSnapshot,
    hasProgressChanged,
    logHeartbeat,
    logTimeout,
} from "./diagnostics.ts";
import type { BridgeProgressSnapshot, BridgeRunSession } from "./types.ts";

function attachStdinLogs(
    session: BridgeRunSession,
): NodeJS.WritableStream | null {
    const STDIN = session.processHandle.stdin;
    if (STDIN === null) {
        logDebug("Planner bridge stdin stream unavailable.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
        return null;
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
    return STDIN;
}

function writePayload(
    session: BridgeRunSession,
    stdin: NodeJS.WritableStream,
    payload: PlanGeneratePayload,
): void {
    const SERIALIZED_PAYLOAD = JSON.stringify(payload);
    logDebug("Writing planner payload to stdin.", {
        requestId: session.executionContext.requestId,
        size: SERIALIZED_PAYLOAD.length,
    });
    const WRITE_RESULT = stdin.write(SERIALIZED_PAYLOAD);
    logDebug("Planner bridge stdin write completed.", {
        module: session.moduleName,
        requestId: session.executionContext.requestId,
        writeAcceptedImmediately: WRITE_RESULT,
    });
}

function endStdin(
    session: BridgeRunSession,
    stdin: NodeJS.WritableStream,
): void {
    stdin.end(() => {
        logDebug("Planner bridge stdin stream ended.", {
            module: session.moduleName,
            requestId: session.executionContext.requestId,
        });
    });
}

export function writePayloadAndClose(
    session: BridgeRunSession,
    payload: PlanGeneratePayload | undefined,
): void {
    const STDIN = attachStdinLogs(session);
    if (STDIN === null) {
        return;
    }
    if (payload !== undefined) {
        writePayload(session, STDIN, payload);
    }
    endStdin(session, STDIN);
}

function logHeartbeatIfChanged(
    session: BridgeRunSession,
    previousSnapshot: BridgeProgressSnapshot,
): BridgeProgressSnapshot {
    const CURRENT_SNAPSHOT = currentProgressSnapshot(session);
    if (!hasProgressChanged(previousSnapshot, CURRENT_SNAPSHOT)) {
        return previousSnapshot;
    }
    const APPENDED_TAIL = appendedLogTail(
        previousSnapshot.logTail,
        CURRENT_SNAPSHOT.logTail,
    );
    logHeartbeat({
        buffers: session.buffers,
        executionContext: session.executionContext,
        logTail: APPENDED_TAIL,
        moduleName: session.moduleName,
        startedAt: session.startedAt,
    });
    return CURRENT_SNAPSHOT;
}

function heartbeatTimer(session: BridgeRunSession): NodeJS.Timeout {
    let previousSnapshot = currentProgressSnapshot(session);
    return setInterval(() => {
        previousSnapshot = logHeartbeatIfChanged(session, previousSnapshot);
    }, BRIDGE_HEARTBEAT_MS);
}

function timeoutTimer(
    session: BridgeRunSession,
    onTimeout: () => void,
): NodeJS.Timeout {
    return setTimeout(() => {
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
}

export function startSessionTimers(
    session: BridgeRunSession,
    onTimeout: () => void,
): () => void {
    const HEARTBEAT = heartbeatTimer(session);
    const TIMEOUT = timeoutTimer(session, onTimeout);
    return (): void => {
        clearInterval(HEARTBEAT);
        clearTimeout(TIMEOUT);
    };
}
