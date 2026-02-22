/**
 * @file Read/write helpers for persisted planner state JSON.
 */
import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "planner_state.json";

/**
 * JSON primitive value accepted by state persistence APIs.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Recursive JSON value accepted by state persistence APIs.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
type SaveResult = { ok: true } | { ok: false; error: string };

/**
 *
 * @param userDataDir
 */
function statePath(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

/**
 * Loads persisted planner state from disk, returning null on failure.
 * @param userDataDir
 */
export function readState(userDataDir: string): JsonValue | null {
  try {
    const text = fs.readFileSync(statePath(userDataDir), "utf8");
    return JSON.parse(text) as JsonValue;
  } catch {
    return null;
  }
}

/**
 * Writes planner state to disk and returns a structured success result.
 * @param userDataDir
 * @param data
 */
export function writeState(userDataDir: string, data: JsonValue): SaveResult {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(
      statePath(userDataDir),
      JSON.stringify(data, null, 2),
      "utf8",
    );
    return { ok: true };
  } catch (error) {
    let message: string;
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    return { ok: false, error: message };
  }
}
