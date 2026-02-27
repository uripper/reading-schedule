/**
 * @file Planner state persistence facade with SQLite primary + JSON compatibility fallback.
 */
import fs from "node:fs";
import type {
  PlannerSaveResult,
  PlannerStateLoadResult,
} from "../types/types.js";
import type { JsonValue } from "../types/types_core.js";
import { readStateFromJson, writeStateToJson } from "./state_store_json";
import {
  jsonStateBackupPath,
  jsonStatePath,
  sqliteStatePath,
} from "./state_store_paths";
import { readStateFromSqlite, writeStateToSqlite } from "./state_store_sqlite";

/**
 * Loads persisted planner state from SQLite first, then JSON fallback paths.
 * @param userDataDir Base Electron user-data directory for this profile.
 * @returns Structured state load result with source and warning metadata.
 */
export function readState(userDataDir: string): PlannerStateLoadResult {
  const sqliteResult = readStateFromSqlite(userDataDir);
  if (sqliteResult !== null) {
    return sqliteResult;
  }

  const jsonResult = readStateFromJson(userDataDir);
  if (jsonResult !== null) {
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
    if (jsonResult.source === "json_primary") {
      return {
        ...jsonResult,
        warningCode: "MIGRATED_JSON_TO_SQLITE",
        warningMessage:
          "Migrated saved data from JSON storage to SQLite durability layer.",
      };
    }
    return jsonResult;
  }

  const hasPersistedArtifacts =
    fs.existsSync(sqliteStatePath(userDataDir)) ||
    fs.existsSync(jsonStatePath(userDataDir)) ||
    fs.existsSync(jsonStateBackupPath(userDataDir));
  if (hasPersistedArtifacts) {
    return {
      state: null,
      source: "fresh",
      warningCode: "STATE_RESET_FRESH",
      warningMessage: "Saved state was unreadable. Started with fresh data.",
    };
  }

  return { state: null, source: "fresh" };
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
