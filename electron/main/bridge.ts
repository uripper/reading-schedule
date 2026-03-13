import { parseBridgeResponseEnvelope } from "@reading-schedule/contracts";
import { logDebug } from "../types/logger.ts";
import type { JsonValue, PlanGeneratePayload } from "../types/types.ts";
import { PLANNER_MODULE_CANDIDATES } from "./bridge/constants.ts";
import { resolveExecutionContext } from "./bridge/context.ts";
import { runBridgeForModule } from "./bridge/runner.ts";
import type { BridgeRunContext } from "./bridge/types.ts";

interface BridgeCandidateArgs {
    args: string[];
    executionContext: ReturnType<typeof resolveExecutionContext>;
    moduleIndex: number;
    payload: PlanGeneratePayload | undefined;
}

function parsedBridgeJson(stdout: string, stderr: string): unknown {
    try {
        return JSON.parse(stdout || "{}");
    } catch {
        throw new Error(stderr || stdout || "Invalid planner response");
    }
}

function envelopeError(
    envelope: ReturnType<typeof parseBridgeResponseEnvelope>,
    stderr: string,
): string {
    return envelope.error ?? (stderr || "Planner failed");
}

function requireEnvelopeData(
    envelope: ReturnType<typeof parseBridgeResponseEnvelope>,
    stderr: string,
): JsonValue {
    if (envelope.ok !== true) {
        throw new Error(envelopeError(envelope, stderr));
    }
    if (envelope.data === undefined) {
        return null;
    }
    return envelope.data;
}

/**
 * Parses planner JSON output and converts planner failures to thrown errors.
 * @param stdout - Raw stdout text from the planner subprocess.
 * @param stderr - Raw stderr text from the planner subprocess.
 * @returns Parsed planner payload or null when no data is returned.
 */
function parseBridgeOutput(stdout: string, stderr: string): JsonValue {
    const ENVELOPE = parseBridgeResponseEnvelope(
        parsedBridgeJson(stdout, stderr),
    );
    return requireEnvelopeData(ENVELOPE, stderr);
}

/**
 * Checks whether a bridge error indicates missing Python module import.
 * @param error - Error thrown by bridge invocation.
 * @param moduleName - Module that was attempted.
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

function nextModuleName(moduleIndex: number): string | null {
    return PLANNER_MODULE_CANDIDATES[moduleIndex + 1] ?? null;
}

function shouldTryFallbackModule(
    error: unknown,
    moduleName: string,
    moduleIndex: number,
): boolean {
    return (
        nextModuleName(moduleIndex) !== null &&
        isMissingModuleError(error, moduleName)
    );
}

function logModuleFallback(
    requestId: string | null,
    moduleIndex: number,
    moduleName: string,
): void {
    logDebug("Planner module missing. Trying fallback module.", {
        missingModule: moduleName,
        nextModule: nextModuleName(moduleIndex),
        requestId,
    });
}

async function runBridgeCandidateAtIndex({
    args,
    executionContext,
    moduleIndex,
    payload,
}: BridgeCandidateArgs): Promise<JsonValue> {
    const MODULE_NAME = PLANNER_MODULE_CANDIDATES[moduleIndex];
    try {
        return await runBridgeForModule({
            args,
            executionContext,
            moduleName: MODULE_NAME,
            parseOutput: parseBridgeOutput,
            payload,
        });
    } catch (error) {
        if (!shouldTryFallbackModule(error, MODULE_NAME, moduleIndex)) {
            throw error;
        }
        logModuleFallback(executionContext.requestId, moduleIndex, MODULE_NAME);
        return await runBridgeCandidateAtIndex({
            args,
            executionContext,
            moduleIndex: moduleIndex + 1,
            payload,
        });
    }
}

/**
 * Executes the Python planner bridge command and returns parsed JSON output.
 * @param args - Planner CLI arguments passed after the module name.
 * @param payload - Optional JSON payload written to planner stdin.
 * @returns Parsed planner JSON response.
 */
export async function runBridge(
    args: string[],
    payload?: PlanGeneratePayload,
    context?: BridgeRunContext,
): Promise<JsonValue> {
    const EXECUTION_CONTEXT = resolveExecutionContext(context);
    if (PLANNER_MODULE_CANDIDATES.length === 0) {
        throw new Error(
            "Planner bridge failed: no candidate module succeeded.",
        );
    }
    return await runBridgeCandidateAtIndex({
        args,
        executionContext: EXECUTION_CONTEXT,
        moduleIndex: 0,
        payload,
    });
}
