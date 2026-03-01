/**
 * @file Bridge that invokes the Python planner module from Electron.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { parseBridgeResponseEnvelope } from "../contracts/planner.js";
import { type JsonValue } from "../types/types.js";

const PLANNER_MODULE = "reading_plan.gui_api";
const PYTHONPATH_SEGMENT = "src";
const PYTHONPATH_KEY = "PYTHONPATH";

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
 * Appends a stream chunk to an accumulated output buffer.
 * @param target Existing text buffer.
 * @param chunk New stdout/stderr chunk from the child process.
 * @returns Updated output buffer.
 */
function appendChunk(target: string, chunk: Buffer | string): string {
    return target + chunk.toString();
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
 * Executes the Python planner bridge command and returns parsed JSON output.
 * @param args Planner CLI arguments passed after the module name.
 * @param payload Optional JSON payload written to planner stdin.
 * @returns Parsed planner JSON response.
 */
export async function runBridge(
    args: string[],
    payload?: JsonValue,
): Promise<JsonValue> {
    return await new Promise((resolve, reject) => {
        const PYTHON_BINARY = process.env.PYTHON_BIN ?? "python";
        const PROCESS_HANDLE = spawn(
            PYTHON_BINARY,
            ["-m", PLANNER_MODULE, ...args],
            {
                cwd: root(),
                env: pyEnv(),
            },
        );
        let stdout = "";
        let stderr = "";
        PROCESS_HANDLE.stdout.on("data", (chunk: Buffer | string) => {
            stdout = appendChunk(stdout, chunk);
        });
        PROCESS_HANDLE.stderr.on("data", (chunk: Buffer | string) => {
            stderr = appendChunk(stderr, chunk);
        });
        PROCESS_HANDLE.on("error", reject);
        PROCESS_HANDLE.on("close", () => {
            try {
                resolve(parseBridgeOutput(stdout, stderr));
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                    return;
                }
                reject(new Error(String(error)));
            }
        });
        if (payload !== undefined) {
            PROCESS_HANDLE.stdin.write(JSON.stringify(payload));
        }
        PROCESS_HANDLE.stdin.end();
    });
}
