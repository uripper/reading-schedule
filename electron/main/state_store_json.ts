/**
 * Atomic JSON planner state read/write helpers with backup fallback.
 */
import fs from "node:fs";
import type {
    JsonValue,
    LoadedPlannerState,
    PlannerSaveResult,
    PlannerStateLoadResult,
} from "../types/types.js";
import {
    jsonStateBackupPath,
    jsonStatePath,
    jsonStateTempPath,
} from "./state_store_paths";

const UTF8_BOM = "\uFEFF";

/**
 * Removes UTF-8 BOM marker when present so JSON parsing remains robust.
 * @param text - Raw UTF-8 file text.
 * @returns BOM-stripped JSON text.
 */
function stripUtf8Bom(text: string): string {
    if (!text.startsWith(UTF8_BOM)) {
        return text;
    }
    return text.slice(1);
}

/**
 * Normalizes parsed JSON payload into an object-like state payload.
 * @param value - Raw parsed JSON value.
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
 * @param filePath - Candidate JSON file path.
 * @returns Parsed object state, or null when file is missing/invalid.
 */
function readJsonObjectFile(filePath: string): LoadedPlannerState | null {
    try {
        const TEXT = stripUtf8Bom(fs.readFileSync(filePath, "utf8"));
        const PARSED = JSON.parse(TEXT) as unknown;
        return objectState(PARSED);
    } catch {
        return null;
    }
}

/**
 * Flushes file contents to disk.
 * @param filePath - Path to fsync.
 */
function fsyncFile(filePath: string): void {
    const FILE = fs.openSync(filePath, "r");
    try {
        fs.fsyncSync(FILE);
    } finally {
        fs.closeSync(FILE);
    }
}

/**
 * Flushes directory metadata updates to disk.
 * @param dirPath - Directory path to fsync.
 */
function fsyncDirectory(dirPath: string): void {
    try {
        const DIRECTORY = fs.openSync(dirPath, "r");
        try {
            fs.fsyncSync(DIRECTORY);
        } finally {
            fs.closeSync(DIRECTORY);
        }
    } catch {
        // Some platforms/filesystems do not support directory fsync.
    }
}

/**
 * Attempts to load planner state from JSON primary/backup files.
 * @param userDataDir - App user-data directory.
 * @returns Load result for JSON sources, or null when unreadable/missing.
 */
export function readStateFromJson(
    userDataDir: string,
): PlannerStateLoadResult | null {
    const PRIMARY_PATH = jsonStatePath(userDataDir);
    const BACKUP_PATH = jsonStateBackupPath(userDataDir);
    const PRIMARY = readJsonObjectFile(PRIMARY_PATH);
    if (PRIMARY) {
        return {
            source: "json_primary",
            sourcePath: PRIMARY_PATH,
            state: PRIMARY,
        };
    }
    const BACKUP = readJsonObjectFile(BACKUP_PATH);
    if (BACKUP) {
        return {
            source: "json_backup",
            sourcePath: BACKUP_PATH,
            state: BACKUP,
            warningCode: "RECOVERED_FROM_BACKUP",
            warningMessage:
                "Recovered saved data from backup copy. Recent unsaved changes may be missing.",
        };
    }
    return null;
}

/**
 * Writes planner state using atomic temp-file rename with backup rotation.
 * @param userDataDir - App user-data directory.
 * @param data - Serializable planner state payload.
 * @returns Save result.
 */
export function writeStateToJson(
    userDataDir: string,
    data: JsonValue,
): PlannerSaveResult {
    const PRIMARY_PATH = jsonStatePath(userDataDir);
    const BACKUP_PATH = jsonStateBackupPath(userDataDir);
    const TEMP_PATH = jsonStateTempPath(userDataDir);
    try {
        fs.mkdirSync(userDataDir, { recursive: true });
        fs.writeFileSync(TEMP_PATH, JSON.stringify(data, null, 2), "utf8");
        fsyncFile(TEMP_PATH);
        if (fs.existsSync(PRIMARY_PATH)) {
            if (fs.existsSync(BACKUP_PATH)) {
                fs.unlinkSync(BACKUP_PATH);
            }
            fs.renameSync(PRIMARY_PATH, BACKUP_PATH);
        }
        fs.renameSync(TEMP_PATH, PRIMARY_PATH);
        fsyncDirectory(userDataDir);
        return { ok: true };
    } catch (error) {
        if (fs.existsSync(TEMP_PATH)) {
            try {
                fs.unlinkSync(TEMP_PATH);
            } catch {
                // Best-effort cleanup.
            }
        }
        if (error instanceof Error) {
            return { error: error.message, ok: false };
        }
        return { error: String(error), ok: false };
    }
}
