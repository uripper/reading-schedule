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
    const userDataDir = tempUserDataDir();
    try {
        for (let index = 0; index < WRITE_COUNT; index += 1) {
            const saveResult = writeStateToSqlite(userDataDir, {
                books: [],
                revision: index,
                settings: {
                    start_date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
                },
            });
            assert.equal(saveResult.ok, true);
        }

        const loadResult = readStateFromSqlite(userDataDir);
        assert.equal(loadResult?.source, "sqlite");
        assert.equal(loadResult?.state?.revision, WRITE_COUNT - 1);

        const database = new DatabaseSync(sqliteStatePath(userDataDir));
        try {
            const row = database
                .prepare("SELECT COUNT(*) AS count FROM planner_state_journal")
                .get();
            const journalCount = Number(row.count ?? 0);
            assert.ok(journalCount <= JOURNAL_LIMIT);
        } finally {
            database.close();
        }
    } finally {
        cleanup(userDataDir);
    }
});

test("SQLite store recovers from snapshot corruption using journal replay", () => {
    const userDataDir = tempUserDataDir();
    try {
        assert.equal(
            writeStateToSqlite(userDataDir, {
                books: [],
                revision: 1,
                settings: { start_date: "2026-02-01" },
            }).ok,
            true,
        );
        assert.equal(
            writeStateToSqlite(userDataDir, {
                books: [],
                revision: 2,
                settings: { start_date: "2026-02-02" },
            }).ok,
            true,
        );

        const database = new DatabaseSync(sqliteStatePath(userDataDir));
        try {
            database.exec(
                "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1",
            );
        } finally {
            database.close();
        }

        const recovered = readStateFromSqlite(userDataDir);
        assert.equal(recovered?.source, "sqlite_journal_replay");
        assert.equal(recovered?.warningCode, "RECOVERED_FROM_JOURNAL");
        assert.equal(recovered?.state?.revision, 2);

        const nextRead = readStateFromSqlite(userDataDir);
        assert.equal(nextRead?.source, "sqlite");
        assert.equal(nextRead?.state?.revision, 2);
    } finally {
        cleanup(userDataDir);
    }
});
