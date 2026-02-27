/**
 * @file Read/write helpers for persisted planner state JSON.
 */
import fs from "node:fs";
import path from "node:path";
import type { JsonValue } from "../types/types_json";
import type { SaveResult } from "../types/main/state_store.js";

const FILE_NAME = "planner_state.json";

/**
 * Builds the absolute path for the persisted planner state file.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @returns Absolute file path to `planner_state.json`.
 */
function statePath(userDataDir: string): string {
  return path.join(userDataDir, FILE_NAME);
}

/**
 * Loads persisted planner state from disk, returning null on failure.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @returns Parsed JSON state or null when the file is missing/invalid.
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
 * @param userDataDir Base Electron user-data directory for this profile.
 * @param data Serializable planner state payload to persist.
 * @returns Success flag or error message suitable for user-facing status.
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
