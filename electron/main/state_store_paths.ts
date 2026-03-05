/**
 * @file Shared path constants/helpers for planner state persistence artifacts.
 */
import path from "node:path";

const JSON_STATE_FILE_NAME = "planner_state.json";
const JSON_STATE_BACKUP_FILE_NAME = "planner_state.json.bak";
const JSON_STATE_TEMP_FILE_NAME = "planner_state.json.tmp";
const SQLITE_STATE_FILE_NAME = "planner_state.sqlite3";
const PYTHON_BRIDGE_LOG_FILE_NAME = "planner_bridge_debug.log";

/**
 * Resolves the primary JSON state file path.
 * @param userDataDir - App user-data directory.
 * @returns Absolute file path.
 */
export function jsonStatePath(userDataDir: string): string {
    return path.join(userDataDir, JSON_STATE_FILE_NAME);
}

/**
 * Resolves the JSON backup state file path.
 * @param userDataDir - App user-data directory.
 * @returns Absolute file path.
 */
export function jsonStateBackupPath(userDataDir: string): string {
    return path.join(userDataDir, JSON_STATE_BACKUP_FILE_NAME);
}

/**
 * Resolves the JSON temporary write path.
 * @param userDataDir - App user-data directory.
 * @returns Absolute file path.
 */
export function jsonStateTempPath(userDataDir: string): string {
    return path.join(userDataDir, JSON_STATE_TEMP_FILE_NAME);
}

/**
 * Resolves the SQLite state database file path.
 * @param userDataDir - App user-data directory.
 * @returns Absolute file path.
 */
export function sqliteStatePath(userDataDir: string): string {
    return path.join(userDataDir, SQLITE_STATE_FILE_NAME);
}

/**
 * Resolves the planner Python bridge debug log file path.
 * @param userDataDir - App user-data directory.
 * @returns Absolute file path.
 */
export function pythonBridgeLogPath(userDataDir: string): string {
    return path.join(userDataDir, PYTHON_BRIDGE_LOG_FILE_NAME);
}
