import { parseBridgeResponseEnvelope } from "@reading-schedule/contracts";
import { logDebug } from "../types/logger.ts";
import type { JsonValue, PlanGeneratePayload } from "../types/types.ts";
import { PLANNER_MODULE_CANDIDATES } from "./bridge/constants.ts";
import { resolveExecutionContext } from "./bridge/context.ts";
import { runBridgeForModule } from "./bridge/runner.ts";
import type { BridgeRunContext } from "./bridge/types.ts";

/**
 * Parses planner JSON output and converts planner failures to thrown errors.
 * @param stdout - Raw stdout text from the planner subprocess.
 * @param stderr - Raw stderr text from the planner subprocess.
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
    const MODULE_COUNT = PLANNER_MODULE_CANDIDATES.length;
    for (let moduleIndex = 0; moduleIndex < MODULE_COUNT; moduleIndex += 1) {
        const MODULE_NAME = PLANNER_MODULE_CANDIDATES[moduleIndex];
        try {
            return await runBridgeForModule({
                args,
                executionContext: EXECUTION_CONTEXT,
                moduleName: MODULE_NAME,
                parseOutput: parseBridgeOutput,
                payload,
            });
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
