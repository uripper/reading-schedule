/**
 * Orchestrates planner bridge subprocess execution, event wiring, and guarded
 * promise settlement for Python module calls.
 */
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
} from "./types.d.ts";

/**
 * Describes the complete input set for a single bridge module invocation.
 */
interface RunBridgeForModuleArgs {
    args: string[];
    executionContext: BridgeExecutionContext;
    moduleName: string;
    parseOutput(stdout: string, stderr: string): JsonValue;
    payload: PlanGeneratePayload | undefined;
}

/**
 * Collects the resolved process launch details for an active bridge session.
 */
interface LaunchSessionArgs {
    executionContext: BridgeExecutionContext;
    launchSpec: ReturnType<typeof resolvePlannerLaunch>;
    moduleName: string;
    timeoutMs: number;
}

/**
 * Bundles the dependencies shared by the session close and error handlers.
 */
interface AttachSessionHandlersArgs {
    clearTimers(): void;
    parseOutput: RunBridgeForModuleArgs["parseOutput"];
    session: BridgeRunSession;
    settle: SettleHandlers;
}

/**
 * Emits a structured debug log before the planner subprocess is spawned.
 * @param args - Launch metadata and execution context for the pending session.
 */
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

/**
 * Spawns the planner subprocess and wraps it in the standard session shape.
 * @param args - Launch metadata and execution context for the bridge session.
 * @returns Newly created bridge session with fresh stdout and stderr buffers.
 */
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
 * Emits the subprocess-spawn lifecycle log for a session.
 * @param session - Active bridge session whose process was just spawned.
 */
function logSpawnedSession(session: BridgeRunSession): void {
    logDebug("Planner bridge subprocess spawned.", {
        module: session.moduleName,
        pid: session.processHandle.pid ?? null,
        requestId: session.executionContext.requestId,
    });
}

/**
 * Emits the subprocess-exit lifecycle log for a session.
 * @param session - Active bridge session whose process exited.
 * @param exitCode - Exit code reported by the child process, if any.
 * @param signal - Termination signal reported by the child process, if any.
 */
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

/**
 * Emits the subprocess-disconnect lifecycle log for a session.
 * @param session - Active bridge session whose process disconnected.
 */
function logDisconnectedSession(session: BridgeRunSession): void {
    logDebug("Planner bridge process disconnected.", {
        module: session.moduleName,
        requestId: session.executionContext.requestId,
    });
}

/**
 * Attaches spawn, exit, and disconnect logging handlers to a session process.
 * @param session - Active bridge session receiving lifecycle logging.
 */
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

/**
 * Wraps a settle callback so it only runs when the settlement guard allows it.
 * @param shouldSettle - Guard that reports whether settlement is still allowed.
 * @param settle - Resolve or reject callback to guard.
 * @returns Callback that settles only on the first permitted invocation.
 */
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

/**
 * Builds guarded resolve and reject callbacks for a bridge session promise.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 * @returns Guarded settle callbacks that ignore duplicate completion attempts.
 */
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

/**
 * Terminates a session after timeout and rejects the pending bridge promise.
 * @param session - Timed-out bridge session.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 */
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

/**
 * Captures the data needed to process a bridge process close event.
 */
interface HandleSessionCloseArgs {
    exitCode: number | null;
    parseOutput: RunBridgeForModuleArgs["parseOutput"];
    session: BridgeRunSession;
    settle: SettleHandlers;
    signal: NodeJS.Signals | null;
}

/**
 * Parses the accumulated bridge output using the caller-provided parser.
 * @param parseOutput - Parser that converts raw stdout and stderr into a JSON result.
 * @param session - Completed bridge session containing buffered output.
 * @returns Parsed JSON value produced by the bridge module output.
 */
function parsedSessionOutput(
    parseOutput: RunBridgeForModuleArgs["parseOutput"],
    session: BridgeRunSession,
): JsonValue {
    return parseOutput(session.buffers.stdout, session.buffers.stderr);
}

/**
 * Rejects with the original error when possible and otherwise normalizes to `Error`.
 * @param error - Unknown thrown value from session processing.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 */
function rejectWithUnknownError(error: unknown, settle: SettleHandlers): void {
    if (error instanceof Error) {
        settle.rejectOnce(error);
        return;
    }
    settle.rejectOnce(new Error(String(error)));
}

/**
 * Logs process closure and resolves the bridge promise from buffered output.
 * @param args - Close-event metadata, parser, and session state for the completed process.
 */
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

/**
 * Attaches the subprocess error handler for a running session.
 * @param args - Session resources needed to reject, log, and clear timers on failure.
 */
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

/**
 * Attaches the subprocess close handler for a running session.
 * @param args - Session resources needed to parse output, settle, and clear timers on close.
 */
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

/**
 * Wires lifecycle, stream, error, and close handlers onto a bridge session.
 * @param args - Session and callback dependencies needed for bridge event handling.
 */
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

/**
 * Creates the timeout callback for a running bridge session.
 * @param session - Active bridge session subject to timeout enforcement.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 * @returns Timeout callback that kills the process and rejects the promise.
 */
function sessionTimeoutHandler(
    session: BridgeRunSession,
    settle: SettleHandlers,
): () => void {
    return (): void => {
        rejectOnTimeout(session, settle);
    };
}

/**
 * Tracks the active bridge session and its timer cleanup handle.
 */
interface RunningSessionState {
    clearTimers(): void;
    session: BridgeRunSession;
}

/**
 * Starts timeout handling and returns the timer cleanup callback for a session.
 * @param session - Active bridge session that needs timeout supervision.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 * @returns Callback that clears all timeout-related timers for the session.
 */
function timedSessionClearer(
    session: BridgeRunSession,
    settle: SettleHandlers,
): () => void {
    return startSessionTimers(session, sessionTimeoutHandler(session, settle));
}

/**
 * Creates the bridge session and its timer cleanup callback.
 * @param options - Launch parameters and parser for the bridge module run.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 * @returns Session state containing the live session and timeout cleanup callback.
 */
function runningSessionState(
    options: RunBridgeForModuleArgs,
    settle: SettleHandlers,
): RunningSessionState {
    const SESSION = createRunSession(
        options.moduleName,
        options.args,
        options.executionContext,
    );
    return {
        clearTimers: timedSessionClearer(SESSION, settle),
        session: SESSION,
    };
}

/**
 * Attaches session handlers and writes the optional payload to planner stdin.
 * @param options - Launch parameters and parser for the bridge module run.
 * @param settle - Guarded resolve and reject callbacks for the session promise.
 * @param state - Running session state containing the process handle and timer cleanup.
 */
function attachAndWriteBridgeSession(
    options: RunBridgeForModuleArgs,
    settle: SettleHandlers,
    state: RunningSessionState,
): void {
    attachSessionHandlers({
        clearTimers: state.clearTimers,
        parseOutput: options.parseOutput,
        session: state.session,
        settle,
    });
    writePayloadAndClose(state.session, options.payload);
}

/**
 * Runs a bridge session inside a promise executor without duplicating setup logic.
 * @param options - Launch parameters and parser for the bridge module run.
 * @param resolve - Promise resolve callback.
 * @param reject - Promise reject callback.
 */
function runBridgeModulePromise(
    options: RunBridgeForModuleArgs,
    resolve: (value: JsonValue) => void,
    reject: (error: Error) => void,
): void {
    const SETTLE = createSettleHandlers(resolve, reject);
    const SESSION_STATE = runningSessionState(options, SETTLE);
    attachAndWriteBridgeSession(options, SETTLE, SESSION_STATE);
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
        runBridgeModulePromise(
            { args, executionContext, moduleName, parseOutput, payload },
            resolve,
            reject,
        );
    });
}
