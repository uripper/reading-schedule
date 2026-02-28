import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { recoverStateFromArgs } from "../scripts/state_recover_helpers.mjs";

const SQLITE_SNAPSHOT_TABLE = `
  CREATE TABLE IF NOT EXISTS planner_state_snapshot (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    schema_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;
const SQLITE_JOURNAL_TABLE = `
  CREATE TABLE IF NOT EXISTS planner_state_journal (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL
  );
`;

/**
 * Creates isolated temporary directory for state-recovery tests.
 * @returns {string} Temporary directory path.
 */
function tempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "state-recover-"));
}

/**
 * Removes temporary directory tree when it exists.
 * @param {string} directory Temporary directory path.
 */
function cleanup(directory) {
    fs.rmSync(directory, { force: true, recursive: true });
}

/**
 * Reads snapshot payload from a recovered SQLite file.
 * @param {string} sqlitePath SQLite file path.
 * @returns {Record<string, unknown>} Parsed snapshot payload.
 */
function readSnapshot(sqlitePath) {
    const database = new DatabaseSync(sqlitePath);
    try {
        const row = database
            .prepare(
                "SELECT payload_json FROM planner_state_snapshot WHERE id = 1",
            )
            .get();
        return JSON.parse(String(row.payload_json));
    } finally {
        database.close();
    }
}

test("state recovery imports JSON input into canonical user-data targets", () => {
    const root = tempDir();
    const inputPath = path.join(root, "input.json");
    const userDataDir = path.join(root, "userData");
    const payload = {
        books: [{ book_id: "book-1", title: "Recovered Book" }],
        last_result: { schedule: [{ date: "2026-02-27", session_index: 1 }] },
        schedule_completions: { "2026-02-27|1|book-1": true },
        sessions: [{ book_id: "book-1", id: "s-1", minutes: 15 }],
        settings: { end_date: "2026-12-31" },
    };
    fs.writeFileSync(inputPath, JSON.stringify(payload), "utf8");
    try {
        const result = recoverStateFromArgs([
            "--input",
            inputPath,
            "--user-data-dir",
            userDataDir,
        ]);
        assert.equal(result.sourceType, "json");
        assert.equal(result.counts.books, 1);
        assert.equal(result.counts.sessions, 1);
        assert.equal(result.counts.scheduleRows, 1);
        assert.equal(result.counts.scheduleCompletions, 1);
        const recoveredJson = JSON.parse(
            fs.readFileSync(
                path.join(userDataDir, "planner_state.json"),
                "utf8",
            ),
        );
        assert.equal(recoveredJson.books.length, 1);
        const recoveredSnapshot = readSnapshot(
            path.join(userDataDir, "planner_state.sqlite3"),
        );
        assert.equal(recoveredSnapshot.last_result.schedule.length, 1);
    } finally {
        cleanup(root);
    }
});

test("state recovery replays SQLite journal when snapshot payload is invalid", () => {
    const root = tempDir();
    const inputPath = path.join(root, "input.sqlite3");
    const userDataDir = path.join(root, "userData");
    const validPayload = {
        books: [{ book_id: "book-2", title: "Journal Book" }],
        last_result: { schedule: [{ date: "2026-02-28", session_index: 2 }] },
        schedule_completions: { "2026-02-28|2|book-2": true },
        sessions: [{ book_id: "book-2", id: "s-2", minutes: 30 }],
        settings: { end_date: "2026-12-31" },
    };
    const database = new DatabaseSync(inputPath);
    try {
        database.exec(SQLITE_SNAPSHOT_TABLE);
        database.exec(SQLITE_JOURNAL_TABLE);
        database
            .prepare(
                "INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at) VALUES (1, 1, ?, ?)",
            )
            .run("{broken-json", "2026-02-27T00:00:00.000Z");
        database
            .prepare(
                "INSERT INTO planner_state_journal (created_at, operation, payload_json) VALUES (?, ?, ?)",
            )
            .run(
                "2026-02-27T00:00:01.000Z",
                "save_snapshot",
                JSON.stringify(validPayload),
            );
    } finally {
        database.close();
    }
    try {
        const result = recoverStateFromArgs([
            "--input",
            inputPath,
            "--user-data-dir",
            userDataDir,
        ]);
        assert.equal(result.sourceType, "sqlite");
        assert.equal(result.counts.books, 1);
        assert.equal(result.counts.sessions, 1);
        assert.equal(result.counts.scheduleRows, 1);
        const recoveredJson = JSON.parse(
            fs.readFileSync(
                path.join(userDataDir, "planner_state.json"),
                "utf8",
            ),
        );
        assert.equal(recoveredJson.books[0].book_id, "book-2");
    } finally {
        cleanup(root);
    }
});
