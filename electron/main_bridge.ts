import { spawn } from "node:child_process";
import path from "node:path";
import type { JsonValue } from "./state_store";

const PLANNER_MODULE = "reading_plan.gui_api";
const PYTHONPATH_SEGMENT = "src";

type BridgeResponse = {
  data?: JsonValue;
  error?: string;
  ok?: boolean;
};

function root(): string {
  return path.join(__dirname, "..", "..");
}

function pyEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONPATH: path.join(root(), PYTHONPATH_SEGMENT),
  };
}

function appendChunk(target: string, chunk: Buffer | string): string {
  return target + chunk.toString();
}

function parseBridgeOutput(stdout: string, stderr: string): JsonValue {
  try {
    const parsed = JSON.parse(stdout || "{}") as BridgeResponse;
    if (!parsed.ok) {
      throw new Error(parsed.error || stderr || "Planner failed");
    }
    if (parsed.data === undefined) {
      return null;
    }
    return parsed.data;
  } catch {
    throw new Error(stderr || stdout || "Invalid planner response");
  }
}

export function runBridge(args: string[], payload?: JsonValue): Promise<JsonValue> {
  return new Promise((resolve, reject) => {
    const pythonBinary = process.env.PYTHON_BIN || "python";
    const processHandle = spawn(pythonBinary, ["-m", PLANNER_MODULE, ...args], {
      cwd: root(),
      env: pyEnv(),
    });
    let stdout = "";
    let stderr = "";
    processHandle.stdout.on("data", (chunk: Buffer | string) => {
      stdout = appendChunk(stdout, chunk);
    });
    processHandle.stderr.on("data", (chunk: Buffer | string) => {
      stderr = appendChunk(stderr, chunk);
    });
    processHandle.on("error", reject);
    processHandle.on("close", () => {
      try {
        resolve(parseBridgeOutput(stdout, stderr));
      } catch (error) {
        reject(error);
      }
    });
    if (payload !== undefined) {
      processHandle.stdin.write(JSON.stringify(payload));
    }
    processHandle.stdin.end();
  });
}
