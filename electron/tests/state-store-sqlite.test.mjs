import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { sqliteStatePath } from "../dist/main/state_store_paths.js";
import {
    readStateFromSqlite,
    writeStateToSqlite,
} from "../dist/main/state_store_sqlite.js";

const WRITE_COUNT = 230;
const JOURNAL_LIMIT = 200;

/**
 * Creates isolated temp user-data directory for persistence tests.
 * @returns {string} Temporary directory path.
 */
function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-sqlite-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param {string} directory Temporary directory path.
 */
function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

test("SQLite store persists roundtrip and trims journal entries", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        for (let index = 0; index < WRITE_COUNT; index += 1) {
            const SAVE_RESULT = writeStateToSqlite(USER_DATA_DIR, {
                books: [],
                revision: index,
                settings: {
                    start_date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
                },
            });
            assert.equal(SAVE_RESULT.ok, true);
        }

        const LOAD_RESULT = readStateFromSqlite(USER_DATA_DIR);
        assert.equal(LOAD_RESULT?.source, "sqlite");
        assert.equal(LOAD_RESULT?.state?.revision, WRITE_COUNT - 1);

        const DATABASE = new DatabaseSync(sqliteStatePath(USER_DATA_DIR));
        try {
            const ROW = DATABASE.prepare(
                "SELECT COUNT(*) AS count FROM planner_state_journal",
            ).get();
            const JOURNAL_COUNT = Number(ROW.count ?? 0);
            assert.ok(JOURNAL_COUNT <= JOURNAL_LIMIT);
        } finally {
            DATABASE.close();
        }
    } finally {
        cleanup(USER_DATA_DIR);
    }
});

test("SQLite store recovers from snapshot corruption using journal replay", () => {
    const USER_DATA_DIR = tempUserDataDir();
    try {
        assert.equal(
            writeStateToSqlite(USER_DATA_DIR, {
                books: [],
                revision: 1,
                settings: { start_date: "2026-02-01" },
            }).ok,
            true,
        );
        assert.equal(
            writeStateToSqlite(USER_DATA_DIR, {
                books: [],
                revision: 2,
                settings: { start_date: "2026-02-02" },
            }).ok,
            true,
        );

        const DATABASE = new DatabaseSync(sqliteStatePath(USER_DATA_DIR));
        try {
            DATABASE.exec(
                "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1",
            );
        } finally {
            DATABASE.close();
        }

        const RECOVERED = readStateFromSqlite(USER_DATA_DIR);
        assert.equal(RECOVERED?.source, "sqlite_journal_replay");
        assert.equal(RECOVERED?.warningCode, "RECOVERED_FROM_JOURNAL");
        assert.equal(RECOVERED?.state?.revision, 2);

        const NEXT_READ = readStateFromSqlite(USER_DATA_DIR);
        assert.equal(NEXT_READ?.source, "sqlite");
        assert.equal(NEXT_READ?.state?.revision, 2);
    } finally {
        cleanup(USER_DATA_DIR);
    }
});
