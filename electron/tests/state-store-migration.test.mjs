import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { readState } from "../dist/main/state_store.js";
import { writeStateToJson } from "../dist/main/state_store_json.js";
import { sqliteStatePath } from "../dist/main/state_store_paths.js";
import { writeStateToSqlite } from "../dist/main/state_store_sqlite.js";

/**
 * Creates isolated temp user-data directory for persistence tests.
 * @returns Temporary directory path.
 */
function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-migration-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param directory - Temporary directory path.
 */
function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

test("Facade reads JSON fallback once, migrates to SQLite, then reads SQLite", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        const SEED = {
            books: [{ book_id: "book-1", title: "Migrated" }],
            settings: { start_date: "2026-03-01" },
        };
        assert.equal(writeStateToJson(USER_DATA_DIR, SEED).ok, true);

        const FIRST_READ = readState(USER_DATA_DIR);
        assert.equal(FIRST_READ.source, "json_primary");
        assert.equal(FIRST_READ.warningCode, "MIGRATED_JSON_TO_SQLITE");
        assert.equal(FIRST_READ.state?.settings?.start_date, "2026-03-01");

        assert.equal(fs.existsSync(sqliteStatePath(USER_DATA_DIR)), true);

        const SECOND_READ = readState(USER_DATA_DIR);
        assert.equal(SECOND_READ.source, "sqlite");
        assert.equal(SECOND_READ.state?.settings?.start_date, "2026-03-01");
    } finally {
        cleanup(USER_DATA_DIR);
    }
});

test("Facade prefers SQLite source when both SQLite and JSON are present", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        assert.equal(
            writeStateToJson(USER_DATA_DIR, {
                books: [{ book_id: "book-json", title: "JSON Source" }],
                settings: { start_date: "2026-03-01" },
            }).ok,
            true,
        );
        assert.equal(
            writeStateToSqlite(USER_DATA_DIR, {
                books: [{ book_id: "book-sqlite", title: "SQLite Source" }],
                settings: { start_date: "2026-03-02" },
            }).ok,
            true,
        );

        const RESULT = readState(USER_DATA_DIR);
        assert.equal(RESULT.source, "sqlite");
        assert.equal(RESULT.state?.settings?.start_date, "2026-03-02");
        assert.equal(RESULT.state?.books?.[0]?.book_id, "book-sqlite");
    } finally {
        cleanup(USER_DATA_DIR);
    }
});
