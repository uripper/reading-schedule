/**
 * @file Planner state persistence facade with SQLite primary + JSON compatibility fallback.
 */
import fs from "node:fs";
import {
    type JsonValue,
    type LoadedPlannerState,
    type PlannerSaveResult,
    type PlannerStateLoadResult,
} from "../types/types.js";
import { readStateFromJson, writeStateToJson } from "./state_store_json";
import {
    jsonStateBackupPath,
    jsonStatePath,
    sqliteStatePath,
} from "./state_store_paths";
import { readStateFromSqlite, writeStateToSqlite } from "./state_store_sqlite";

/**
 * Returns true when state payload contains required bootstrap fields.
 * @param state Candidate loaded state payload.
 * @returns True when settings and books are both present.
 */
function hasBootstrapState(state: LoadedPlannerState | null): boolean {
    if (state === null) {
        return false;
    }
    if (state.settings === undefined) {
        return false;
    }
    if (state.books === undefined) {
        return false;
    }
    return true;
}

/**
 * Returns true when persistence artifacts exist on disk.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @returns True when at least one persistence artifact exists.
 */
function hasPersistedArtifacts(userDataDir: string): boolean {
    return (
        fs.existsSync(sqliteStatePath(userDataDir)) ||
        fs.existsSync(jsonStatePath(userDataDir)) ||
        fs.existsSync(jsonStateBackupPath(userDataDir))
    );
}

/**
 * Backfills SQLite from JSON state and decorates warnings when migration fails.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @param jsonResult Loaded JSON state result.
 * @returns JSON result with migration metadata applied.
 */
function migratedJsonResult(
    userDataDir: string,
    jsonResult: PlannerStateLoadResult,
): PlannerStateLoadResult {
    const backfill = writeStateToSqlite(
        userDataDir,
        jsonResult.state as unknown as JsonValue,
    );
    if (backfill.ok === false) {
        return {
            ...jsonResult,
            warningMessage: `Loaded JSON fallback but SQLite migration failed: ${backfill.error}`,
        };
    }
    if (jsonResult.source !== "json_primary") {
        return jsonResult;
    }
    return {
        ...jsonResult,
        warningCode: "MIGRATED_JSON_TO_SQLITE",
        warningMessage: "Migrated saved data from JSON storage to SQLite.",
    };
}

/**
 * Loads persisted planner state from SQLite first, then JSON fallback paths.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @returns Structured state load result with source and warning metadata.
 */
export function readState(userDataDir: string): PlannerStateLoadResult {
    const sqliteResult = readStateFromSqlite(userDataDir);
    if (sqliteResult !== null && hasBootstrapState(sqliteResult.state)) {
        return sqliteResult;
    }
    const jsonResult = readStateFromJson(userDataDir);
    if (jsonResult !== null) {
        return migratedJsonResult(userDataDir, jsonResult);
    }
    if (sqliteResult !== null) {
        return sqliteResult;
    }
    if (hasPersistedArtifacts(userDataDir)) {
        return {
            source: "fresh",
            sourcePath: userDataDir,
            state: null,
            warningCode: "STATE_RESET_FRESH",
            warningMessage:
                "Saved state was unreadable. Started with fresh data.",
        };
    }
    return {
        source: "fresh",
        sourcePath: userDataDir,
        state: null,
    };
}

/**
 * Writes planner state to SQLite primary store plus JSON compatibility files.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @param data Serializable planner state payload to persist.
 * @returns Structured save result.
 */
export function writeState(
    userDataDir: string,
    data: JsonValue,
): PlannerSaveResult {
    const sqliteSave = writeStateToSqlite(userDataDir, data);
    if (sqliteSave.ok === false) {
        return sqliteSave;
    }

    const jsonSave = writeStateToJson(userDataDir, data);
    if (jsonSave.ok === false) {
        return {
            ok: true,
            warningMessage: `SQLite save succeeded but JSON compatibility write failed: ${jsonSave.error}`,
        };
    }
    return sqliteSave;
}
