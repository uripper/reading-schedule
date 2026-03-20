// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const Require = createRequire(import.meta.url);
const { DatabaseSync } = Require("node:sqlite");
const { sqliteStatePath } = Require("../dist/main/state_store_paths.js");
const { readStateFromSqlite, writeStateToSqlite } = Require(
    "../dist/main/state_store_sqlite.js",
);

const WRITE_COUNT = 230;
const JOURNAL_LIMIT = 200;

/**
 * Creates isolated temp user-data directory for persistence tests.
 * @returns Temporary directory path.
 */
function tempUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "planner-state-sqlite-"));
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

function assertSqliteWrite(userDataDir, state) {
    const SAVE_RESULT = writeStateToSqlite(userDataDir, state);
    assert.equal(SAVE_RESULT.ok, true);
}

function journalEntryCount(userDataDir) {
    const DATABASE = new DatabaseSync(sqliteStatePath(userDataDir));
    try {
        const ROW = DATABASE.prepare(
            "SELECT COUNT(*) AS count FROM planner_state_journal",
        ).get();
        return Number(ROW.count ?? 0);
    } finally {
        DATABASE.close();
    }
}

function seedSqliteRevisions(userDataDir) {
    for (let index = 0; index < WRITE_COUNT; index += 1) {
        assertSqliteWrite(userDataDir, {
            books: [],
            revision: index,
            settings: {
                start_date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`,
            },
        });
    }
}

function corruptSnapshotPayload(userDataDir) {
    const DATABASE = new DatabaseSync(sqliteStatePath(userDataDir));
    try {
        DATABASE.exec(
            "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1",
        );
    } finally {
        DATABASE.close();
    }
}

function seedJournalRecoveryState(userDataDir) {
    assertSqliteWrite(userDataDir, {
        books: [],
        revision: 1,
        settings: { start_date: "2026-02-01" },
    });
    assertSqliteWrite(userDataDir, {
        books: [],
        revision: 2,
        settings: { start_date: "2026-02-02" },
    });
}

function assertJournalRecovery(userDataDir) {
    const RECOVERED = readStateFromSqlite(userDataDir);
    assert.equal(RECOVERED?.source, "sqlite_journal_replay");
    assert.equal(RECOVERED?.warningCode, "RECOVERED_FROM_JOURNAL");
    assert.equal(RECOVERED?.state?.revision, 2);
    const NEXT_READ = readStateFromSqlite(userDataDir);
    assert.equal(NEXT_READ?.source, "sqlite");
    assert.equal(NEXT_READ?.state?.revision, 2);
}

test("SQLite store persists roundtrip and trims journal entries", () => {
    withTempUserData((userDataDir) => {
        seedSqliteRevisions(userDataDir);
        const LOAD_RESULT = readStateFromSqlite(userDataDir);
        assert.equal(LOAD_RESULT?.source, "sqlite");
        assert.equal(LOAD_RESULT?.state?.revision, WRITE_COUNT - 1);
        assert.ok(journalEntryCount(userDataDir) <= JOURNAL_LIMIT);
    });
});

test("SQLite store recovers from snapshot corruption using journal replay", () => {
    withTempUserData((userDataDir) => {
        seedJournalRecoveryState(userDataDir);
        corruptSnapshotPayload(userDataDir);
        assertJournalRecovery(userDataDir);
    });
});
