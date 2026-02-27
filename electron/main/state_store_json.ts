/**
 * @file Atomic JSON planner state read/write helpers with backup fallback.
 */
import fs from "node:fs";
import type {
  LoadedPlannerState,
  PlannerSaveResult,
  PlannerStateLoadResult,
} from "../types/types.js";
import type { JsonValue } from "../types/types_core.js";
import {
  jsonStateBackupPath,
  jsonStatePath,
  jsonStateTempPath,
} from "./state_store_paths";

/**
 * Normalizes parsed JSON payload into an object-like state payload.
 * @param value Raw parsed JSON value.
 * @returns Object payload when valid, otherwise null.
 */
function objectState(value: unknown): LoadedPlannerState | null {
  if (value === null) {
    return null;
  }
  if (Array.isArray(value)) {
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }
  return value as LoadedPlannerState;
}

/**
 * Parses one JSON file into object state payload.
 * @param filePath Candidate JSON file path.
 * @returns Parsed object state, or null when file is missing/invalid.
 */
function readJsonObjectFile(filePath: string): LoadedPlannerState | null {
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(text) as unknown;
    return objectState(parsed);
  } catch {
    return null;
  }
}

/**
 * Flushes file contents to disk.
 * @param filePath Path to fsync.
 */
function fsyncFile(filePath: string): void {
  const file = fs.openSync(filePath, "r");
  try {
    fs.fsyncSync(file);
  } finally {
    fs.closeSync(file);
  }
}

/**
 * Flushes directory metadata updates to disk.
 * @param dirPath Directory path to fsync.
 */
function fsyncDirectory(dirPath: string): void {
  try {
    const directory = fs.openSync(dirPath, "r");
    try {
      fs.fsyncSync(directory);
    } finally {
      fs.closeSync(directory);
    }
  } catch {
    // Some platforms/filesystems do not support directory fsync.
  }
}

/**
 * Attempts to load planner state from JSON primary/backup files.
 * @param userDataDir App user-data directory.
 * @returns Load result for JSON sources, or null when unreadable/missing.
 */
export function readStateFromJson(userDataDir: string): PlannerStateLoadResult | null {
  const primaryPath = jsonStatePath(userDataDir);
  const backupPath = jsonStateBackupPath(userDataDir);
  const primary = readJsonObjectFile(primaryPath);
  if (primary) {
    return { state: primary, source: "json_primary" };
  }
  const backup = readJsonObjectFile(backupPath);
  if (backup) {
    return {
      state: backup,
      source: "json_backup",
      warningCode: "RECOVERED_FROM_BACKUP",
      warningMessage:
        "Recovered saved data from backup copy. Recent unsaved changes may be missing.",
    };
  }
  return null;
}

/**
 * Writes planner state using atomic temp-file rename with backup rotation.
 * @param userDataDir App user-data directory.
 * @param data Serializable planner state payload.
 * @returns Save result.
 */
export function writeStateToJson(
  userDataDir: string,
  data: JsonValue,
): PlannerSaveResult {
  const primaryPath = jsonStatePath(userDataDir);
  const backupPath = jsonStateBackupPath(userDataDir);
  const tempPath = jsonStateTempPath(userDataDir);
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fsyncFile(tempPath);
    if (fs.existsSync(primaryPath)) {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
      fs.renameSync(primaryPath, backupPath);
    }
    fs.renameSync(tempPath, primaryPath);
    fsyncDirectory(userDataDir);
    return { ok: true };
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Best-effort cleanup.
      }
    }
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: String(error) };
  }
}
