import { spawn } from "node:child_process";
import { logDebug } from "../../types/logger.ts";
import type { JsonValue, PlanGeneratePayload } from "../../types/types.ts";
import { bridgeTimeoutMs } from "./context.ts";
import {
    attachStreamHandlers,
    logParseFailure,
    logProcessClose,
    logProcessError,
} from "./diagnostics.ts";
import { resolvePlannerLaunch } from "./launch.ts";
import { startSessionTimers, writePayloadAndClose } from "./session-runtime.ts";
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

interface LaunchSessionArgs {
    executionContext: BridgeExecutionContext;
    launchSpec: ReturnType<typeof resolvePlannerLaunch>;
    moduleName: string;
    timeoutMs: number;
}

interface AttachSessionHandlersArgs {
    clearTimers(): void;
    parseOutput: RunBridgeForModuleArgs["parseOutput"];
    session: BridgeRunSession;
    settle: SettleHandlers;
}

function logSpawnSpec(args: LaunchSessionArgs): void {
    logDebug("Spawning planner bridge process.", {
        args: args.launchSpec.args,
        command: args.launchSpec.command,
        cwd: args.launchSpec.cwd,
        logPath: args.executionContext.logPath,
        module: args.moduleName,
        requestId: args.executionContext.requestId,
        timeoutMs: args.timeoutMs,
    });
}

function runSessionFromLaunch(args: LaunchSessionArgs): BridgeRunSession {
    return {
        buffers: { stderr: "", stdout: "" },
        executionContext: args.executionContext,
        moduleName: args.moduleName,
        processHandle: spawn(args.launchSpec.command, args.launchSpec.args, {
            cwd: args.launchSpec.cwd,
            env: args.executionContext.env,
        }),
        startedAt: Date.now(),
        timeoutMs: args.timeoutMs,
    };
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
    const LAUNCH_ARGS: LaunchSessionArgs = {
        executionContext,
        launchSpec: resolvePlannerLaunch(moduleName, args),
        moduleName,
        timeoutMs: bridgeTimeoutMs(),
    };
    logSpawnSpec(LAUNCH_ARGS);
    return runSessionFromLaunch(LAUNCH_ARGS);
}

/**
 * Attaches spawn/exit/disconnect lifecycle diagnostics.
 */
function logSpawnedSession(session: BridgeRunSession): void {
    logDebug("Planner bridge subprocess spawned.", {
        module: session.moduleName,
        pid: session.processHandle.pid ?? null,
        requestId: session.executionContext.requestId,
    });
}

function logExitedSession(
    session: BridgeRunSession,
    exitCode: number | null,
    signal: NodeJS.Signals | null,
): void {
    logDebug("Planner bridge process exited.", {
        exitCode: Number(exitCode ?? 0),
        module: session.moduleName,
        requestId: session.executionContext.requestId,
        signal: signal ?? null,
    });
}

function logDisconnectedSession(session: BridgeRunSession): void {
    logDebug("Planner bridge process disconnected.", {
        module: session.moduleName,
        requestId: session.executionContext.requestId,
    });
}

function attachLifecycleLogs(session: BridgeRunSession): void {
    session.processHandle.on("spawn", () => {
        logSpawnedSession(session);
    });
    session.processHandle.on("exit", (exitCode, signal) => {
        logExitedSession(session, exitCode, signal);
    });
    session.processHandle.on("disconnect", () => {
        logDisconnectedSession(session);
    });
}

/**
 * Builds guarded resolve/reject callbacks to avoid duplicate promise settlement.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 * @returns Object with guarded resolveOnce and rejectOnce callbacks.
 */
function createSettleGuard(): () => boolean {
    let settled = false;
    return (): boolean => {
        if (settled) {
            return false;
        }
        settled = true;
        return true;
    };
}

function guardedSettle<T>(
    shouldSettle: () => boolean,
    settle: (value: T) => void,
): (value: T) => void {
    return (value: T): void => {
        if (!shouldSettle()) {
            return;
        }
        settle(value);
    };
}

function createSettleHandlers(
    resolve: (value: JsonValue) => void,
    reject: (error: Error) => void,
): SettleHandlers {
    const SHOULD_SETTLE = createSettleGuard();
    return {
        rejectOnce: guardedSettle(SHOULD_SETTLE, reject),
        resolveOnce: guardedSettle(SHOULD_SETTLE, resolve),
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

function parsedSessionOutput(
    parseOutput: RunBridgeForModuleArgs["parseOutput"],
    session: BridgeRunSession,
): JsonValue {
    return parseOutput(session.buffers.stdout, session.buffers.stderr);
}

function rejectWithUnknownError(error: unknown, settle: SettleHandlers): void {
    if (error instanceof Error) {
        settle.rejectOnce(error);
        return;
    }
    settle.rejectOnce(new Error(String(error)));
}

function handleSessionClose({
    exitCode,
    parseOutput,
    session,
    settle,
    signal,
}: HandleSessionCloseArgs): void {
    logProcessClose({
        buffers: session.buffers,
        executionContext: session.executionContext,
        exitCode,
        signal,
    });
    try {
        settle.resolveOnce(parsedSessionOutput(parseOutput, session));
    } catch (error) {
        logParseFailure(session.buffers, session.executionContext);
        rejectWithUnknownError(error, settle);
    }
}

function attachSessionErrorHandler(args: AttachSessionHandlersArgs): void {
    args.session.processHandle.on("error", (error: Error) => {
        args.clearTimers();
        logProcessError(
            error,
            args.session.buffers,
            args.session.executionContext,
        );
        args.settle.rejectOnce(error);
    });
}

function attachSessionCloseHandler(args: AttachSessionHandlersArgs): void {
    args.session.processHandle.on("close", (exitCode, signal) => {
        args.clearTimers();
        handleSessionClose({
            exitCode,
            parseOutput: args.parseOutput,
            session: args.session,
            settle: args.settle,
            signal,
        });
    });
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
    attachSessionErrorHandler({ clearTimers, parseOutput, session, settle });
    attachSessionCloseHandler({ clearTimers, parseOutput, session, settle });
}

function sessionTimeoutHandler(
    session: BridgeRunSession,
    settle: SettleHandlers,
): () => void {
    return (): void => {
        rejectOnTimeout(session, settle);
    };
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
        const CLEAR_TIMERS = startSessionTimers(
            SESSION,
            sessionTimeoutHandler(SESSION, SETTLE),
        );
        attachSessionHandlers({
            clearTimers: CLEAR_TIMERS,
            parseOutput,
            session: SESSION,
            settle: SETTLE,
        });
        writePayloadAndClose(SESSION, payload);
    });
}
