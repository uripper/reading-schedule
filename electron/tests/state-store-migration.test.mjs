// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const Require = createRequire(import.meta.url);
const { readState } = Require("../dist/main/state_store.js");
const { writeStateToJson } = Require("../dist/main/state_store_json.js");
const { sqliteStatePath } = Require("../dist/main/state_store_paths.js");
const { writeStateToSqlite } = Require("../dist/main/state_store_sqlite.js");

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

function assertSqliteWrite(userDataDir, state) {
    assert.equal(writeStateToSqlite(userDataDir, state).ok, true);
}

test("Facade reads JSON fallback once, migrates to SQLite, then reads SQLite", () => {
    withTempUserData((userDataDir) => {
        assertJsonWrite(userDataDir, {
            books: [{ book_id: "book-1", title: "Migrated" }],
            settings: { start_date: "2026-03-01" },
        });
        const FIRST_READ = readState(userDataDir);
        assert.equal(FIRST_READ.source, "json_primary");
        assert.equal(FIRST_READ.warningCode, "MIGRATED_JSON_TO_SQLITE");
        assert.equal(FIRST_READ.state?.settings?.start_date, "2026-03-01");
        assert.equal(fs.existsSync(sqliteStatePath(userDataDir)), true);
        const SECOND_READ = readState(userDataDir);
        assert.equal(SECOND_READ.source, "sqlite");
        assert.equal(SECOND_READ.state?.settings?.start_date, "2026-03-01");
    });
});

test("Facade prefers SQLite source when both SQLite and JSON are present", () => {
    withTempUserData((userDataDir) => {
        assertJsonWrite(userDataDir, {
            books: [{ book_id: "book-json", title: "JSON Source" }],
            settings: { start_date: "2026-03-01" },
        });
        assertSqliteWrite(userDataDir, {
            books: [{ book_id: "book-sqlite", title: "SQLite Source" }],
            settings: { start_date: "2026-03-02" },
        });
        const RESULT = readState(userDataDir);
        assert.equal(RESULT.source, "sqlite");
        assert.equal(RESULT.state?.settings?.start_date, "2026-03-02");
        assert.equal(RESULT.state?.books?.[0]?.book_id, "book-sqlite");
    });
});
