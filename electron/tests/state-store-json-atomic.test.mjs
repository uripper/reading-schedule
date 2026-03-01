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
 * @returns {string} Temporary directory path.
 */
function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-json-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param {string} directory Temporary directory path.
 */
function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

test("JSON store rotates backup and recovers from corrupted primary", () => {
    const userDataDir = tempUserDataDir();
    try {
        const firstState = {
            books: [],
            settings: { start_date: "2026-01-01" },
        };
        const secondState = {
            books: [{ book_id: "b-1", title: "Book" }],
            settings: { start_date: "2026-02-01" },
        };

        assert.equal(writeStateToJson(userDataDir, firstState).ok, true);
        assert.equal(writeStateToJson(userDataDir, secondState).ok, true);

        const primaryResult = readStateFromJson(userDataDir);
        assert.equal(primaryResult?.source, "json_primary");
        assert.equal(primaryResult?.state?.settings?.start_date, "2026-02-01");

        fs.writeFileSync(jsonStatePath(userDataDir), "{broken", "utf8");

        const backupResult = readStateFromJson(userDataDir);
        assert.equal(backupResult?.source, "json_backup");
        assert.equal(backupResult?.warningCode, "RECOVERED_FROM_BACKUP");
        assert.equal(backupResult?.state?.settings?.start_date, "2026-01-01");
    } finally {
        cleanup(userDataDir);
    }
});

test("Facade emits fresh-warning when persisted JSON artifacts are unreadable", () => {
    const userDataDir = tempUserDataDir();
    try {
        assert.equal(
            writeStateToJson(userDataDir, { books: [], settings: {} }).ok,
            true,
        );
        assert.equal(
            writeStateToJson(userDataDir, { books: [], settings: {} }).ok,
            true,
        );

        fs.writeFileSync(jsonStatePath(userDataDir), "{broken", "utf8");
        fs.writeFileSync(
            jsonStateBackupPath(userDataDir),
            "{alsoBroken",
            "utf8",
        );

        const loadResult = readState(userDataDir);
        assert.equal(loadResult.source, "fresh");
        assert.equal(loadResult.state, null);
        assert.equal(loadResult.warningCode, "STATE_RESET_FRESH");
    } finally {
        cleanup(userDataDir);
    }
});

test("Facade emits fresh-warning when persisted JSON artifacts fail schema validation", () => {
    const userDataDir = tempUserDataDir();
    try {
        fs.mkdirSync(userDataDir, { recursive: true });
        fs.writeFileSync(
            jsonStatePath(userDataDir),
            JSON.stringify({ books: "bad", settings: {} }),
            "utf8",
        );
        fs.writeFileSync(
            jsonStateBackupPath(userDataDir),
            JSON.stringify({ books: "bad", settings: {} }),
            "utf8",
        );

        const loadResult = readState(userDataDir);
        assert.equal(loadResult.source, "fresh");
        assert.equal(loadResult.state, null);
        assert.equal(loadResult.warningCode, "STATE_RESET_FRESH");
    } finally {
        cleanup(userDataDir);
    }
});
