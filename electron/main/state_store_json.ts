/**
 * Atomic JSON planner state read/write helpers with backup fallback.
 */
import fs from "node:fs";
import type {
    JsonValue,
    LoadedPlannerState,
    PlannerSaveResult,
    PlannerStateLoadResult,
} from "../types/types.ts";
import {
    jsonStateBackupPath,
    jsonStatePath,
    jsonStateTempPath,
} from "./state_store_paths.ts";

const UTF8_BOM = "\uFEFF";

interface AtomicWriteArgs {
    backupPath: string;
    data: JsonValue;
    primaryPath: string;
    tempPath: string;
    userDataDir: string;
}

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
export function objectState(value: unknown): LoadedPlannerState | null {
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

function deleteFileIfPresent(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        return;
    }
    fs.unlinkSync(filePath);
}

function rotatePrimaryStateFile(primaryPath: string, backupPath: string): void {
    if (!fs.existsSync(primaryPath)) {
        return;
    }
    deleteFileIfPresent(backupPath);
    fs.renameSync(primaryPath, backupPath);
}

function writeTempStateFile(tempPath: string, data: JsonValue): void {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fsyncFile(tempPath);
}

function removeTempStateFile(tempPath: string): void {
    try {
        deleteFileIfPresent(tempPath);
    } catch {
        // Best-effort cleanup.
    }
}

function persistStateAtomically({
    backupPath,
    data,
    primaryPath,
    tempPath,
    userDataDir,
}: AtomicWriteArgs): void {
    fs.mkdirSync(userDataDir, { recursive: true });
    writeTempStateFile(tempPath, data);
    rotatePrimaryStateFile(primaryPath, backupPath);
    fs.renameSync(tempPath, primaryPath);
    fsyncDirectory(userDataDir);
}

function primaryJsonLoadResult(
    filePath: string,
    state: LoadedPlannerState,
): PlannerStateLoadResult {
    return {
        source: "json_primary",
        sourcePath: filePath,
        state,
    };
}

function backupJsonLoadResult(
    filePath: string,
    state: LoadedPlannerState,
): PlannerStateLoadResult {
    return {
        source: "json_backup",
        sourcePath: filePath,
        state,
        warningCode: "RECOVERED_FROM_BACKUP",
        warningMessage:
            "Recovered saved data from backup copy. Recent unsaved changes may be missing.",
    };
}

function readPrimaryStateResult(
    filePath: string,
): PlannerStateLoadResult | null {
    const PRIMARY_STATE = readJsonObjectFile(filePath);
    if (PRIMARY_STATE === null) {
        return null;
    }
    return primaryJsonLoadResult(filePath, PRIMARY_STATE);
}

function readBackupStateResult(
    filePath: string,
): PlannerStateLoadResult | null {
    const BACKUP_STATE = readJsonObjectFile(filePath);
    if (BACKUP_STATE === null) {
        return null;
    }
    return backupJsonLoadResult(filePath, BACKUP_STATE);
}

/**
 * Attempts to load planner state from JSON primary/backup files.
 * @param userDataDir - App user-data directory.
 * @returns Load result for JSON sources, or null when unreadable/missing.
 */
export function readStateFromJson(
    userDataDir: string,
): PlannerStateLoadResult | null {
    const PRIMARY_RESULT = readPrimaryStateResult(jsonStatePath(userDataDir));
    if (PRIMARY_RESULT !== null) {
        return PRIMARY_RESULT;
    }
    return readBackupStateResult(jsonStateBackupPath(userDataDir));
}

function persistStateToJson(userDataDir: string, data: JsonValue): void {
    persistStateAtomically({
        backupPath: jsonStateBackupPath(userDataDir),
        data,
        primaryPath: jsonStatePath(userDataDir),
        tempPath: jsonStateTempPath(userDataDir),
        userDataDir,
    });
}

function failedJsonWrite(
    userDataDir: string,
    error: unknown,
): PlannerSaveResult {
    removeTempStateFile(jsonStateTempPath(userDataDir));
    return returnErrorMessage(error);
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
    try {
        persistStateToJson(userDataDir, data);
        return { ok: true };
    } catch (error) {
        return failedJsonWrite(userDataDir, error);
    }
}
/**
 * Just a helper to extract copied code around error message extraction
 * and reporting.
 * @param error - Unknown error value, often from a catch block.
 * @returns Extracted error message as a string.
 */
export function returnErrorMessage(error: unknown): PlannerSaveResult {
    if (error instanceof Error) {
        return { error: error.message, ok: false };
    }
    return { error: String(error), ok: false };
}
