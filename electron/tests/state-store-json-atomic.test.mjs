import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const { readState } = require("../dist/main/state_store.js");
const { readStateFromJson, writeStateToJson } = require("../dist/main/state_store_json.js");
const { jsonStateBackupPath, jsonStatePath } = require("../dist/main/state_store_paths.js");

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

function withTempUserData(work) {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        work(USER_DATA_DIR);
    } finally {
        cleanup(USER_DATA_DIR);
    }
}

function assertJsonWrite(userDataDir, state) {
    assert.equal(writeStateToJson(userDataDir, state).ok, true);
}

function corruptPrimaryJson(userDataDir) {
    fs.writeFileSync(jsonStatePath(userDataDir), "{broken", "utf8");
}

function corruptBackupJson(userDataDir) {
    fs.writeFileSync(jsonStateBackupPath(userDataDir), "{alsoBroken", "utf8");
}

function assertPrimaryJsonState(userDataDir, startDate) {
    const PRIMARY_RESULT = readStateFromJson(userDataDir);
    assert.equal(PRIMARY_RESULT?.source, "json_primary");
    assert.equal(PRIMARY_RESULT?.state?.settings?.start_date, startDate);
}

function assertBackupJsonState(userDataDir, startDate) {
    const BACKUP_RESULT = readStateFromJson(userDataDir);
    assert.equal(BACKUP_RESULT?.source, "json_backup");
    assert.equal(BACKUP_RESULT?.warningCode, "RECOVERED_FROM_BACKUP");
    assert.equal(BACKUP_RESULT?.state?.settings?.start_date, startDate);
}

test("JSON store rotates backup and recovers from corrupted primary", () => {
    withTempUserData((USER_DATA_DIR) => {
        assertJsonWrite(USER_DATA_DIR, { books: [], settings: { start_date: "2026-01-01" } });
        assertJsonWrite(USER_DATA_DIR, {
            books: [{ book_id: "b-1", title: "Book" }],
            settings: { start_date: "2026-02-01" },
        });
        assertPrimaryJsonState(USER_DATA_DIR, "2026-02-01");
        corruptPrimaryJson(USER_DATA_DIR);
        assertBackupJsonState(USER_DATA_DIR, "2026-01-01");
    });
});

test("Facade emits fresh-warning when persisted JSON artifacts are unreadable", () => {
    withTempUserData((USER_DATA_DIR) => {
        assertJsonWrite(USER_DATA_DIR, { books: [], settings: {} });
        assertJsonWrite(USER_DATA_DIR, { books: [], settings: {} });
        corruptPrimaryJson(USER_DATA_DIR);
        corruptBackupJson(USER_DATA_DIR);
        const LOAD_RESULT = readState(USER_DATA_DIR);
        assert.equal(LOAD_RESULT.source, "fresh");
        assert.equal(LOAD_RESULT.state, null);
        assert.equal(LOAD_RESULT.warningCode, "STATE_RESET_FRESH");
    });
});
