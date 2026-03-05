import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readState } from "../dist/main/state_store.js";
import {
    readStateFromJson,
    writeStateToJson,
} from "../dist/main/state_store_json.js";
import {
    jsonStateBackupPath,
    jsonStatePath,
} from "../dist/main/state_store_paths.js";

/**
 * Creates isolated temp user-data directory for persistence tests.
 * @returns Temporary directory path.
 */
function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-json-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param directory - Temporary directory path.
 */
function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

test("JSON store rotates backup and recovers from corrupted primary", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        const FIRST_STATE = {
            books: [],
            settings: { start_date: "2026-01-01" },
        };
        const SECOND_STATE = {
            books: [{ book_id: "b-1", title: "Book" }],
            settings: { start_date: "2026-02-01" },
        };

        assert.equal(writeStateToJson(USER_DATA_DIR, FIRST_STATE).ok, true);
        assert.equal(writeStateToJson(USER_DATA_DIR, SECOND_STATE).ok, true);

        const PRIMARY_RESULT = readStateFromJson(USER_DATA_DIR);
        assert.equal(PRIMARY_RESULT?.source, "json_primary");
        assert.equal(PRIMARY_RESULT?.state?.settings?.start_date, "2026-02-01");

        fs.writeFileSync(jsonStatePath(USER_DATA_DIR), "{broken", "utf8");

        const BACKUP_RESULT = readStateFromJson(USER_DATA_DIR);
        assert.equal(BACKUP_RESULT?.source, "json_backup");
        assert.equal(BACKUP_RESULT?.warningCode, "RECOVERED_FROM_BACKUP");
        assert.equal(BACKUP_RESULT?.state?.settings?.start_date, "2026-01-01");
    } finally {
        cleanup(USER_DATA_DIR);
    }
});

test("Facade emits fresh-warning when persisted JSON artifacts are unreadable", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        assert.equal(
            writeStateToJson(USER_DATA_DIR, { books: [], settings: {} }).ok,
            true,
        );
        assert.equal(
            writeStateToJson(USER_DATA_DIR, { books: [], settings: {} }).ok,
            true,
        );

        fs.writeFileSync(jsonStatePath(USER_DATA_DIR), "{broken", "utf8");
        fs.writeFileSync(
            jsonStateBackupPath(USER_DATA_DIR),
            "{alsoBroken",
            "utf8",
        );

        const LOAD_RESULT = readState(USER_DATA_DIR);
        assert.equal(LOAD_RESULT.source, "fresh");
        assert.equal(LOAD_RESULT.state, null);
        assert.equal(LOAD_RESULT.warningCode, "STATE_RESET_FRESH");
    } finally {
        cleanup(USER_DATA_DIR);
    }
});
